// HubSpot helper: contacts (upsert), deals (create, move stage, read stage), stage lookup by name.
// Uses axios with our private app token.

const axios = require('axios');
require('dotenv').config();

const BASE = 'https://api.hubapi.com';

function api() {
  return axios.create({
    baseURL: BASE,
    headers: {
      Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
}

// Find a contact by email. Returns the contact object or null.
async function findContactByEmail(email) {
  const res = await api().post('/crm/v3/objects/contacts/search', {
    filterGroups: [
      { filters: [{ propertyName: 'email', operator: 'EQ', value: email }] },
    ],
    properties: ['email', 'firstname', 'lastname'],
    limit: 1,
  });
  return res.data.results[0] || null;
}

// Create the contact, or update it if the email already exists. Always returns the contact.
async function upsertContact({ email, firstName, lastName, phone, course, programLevel }) {
  try {
    const properties = {};
    if (email) properties.email = email;
    if (firstName) properties.firstname = firstName;
    if (lastName) properties.lastname = lastName;
    if (phone) properties.phone = phone;
    if (course) properties.jobtitle = `Applicant - ${course}${programLevel ? ` (${programLevel})` : ''}`;

    const existing = await findContactByEmail(email);

    if (existing) {
      const res = await api().patch(`/crm/v3/objects/contacts/${existing.id}`, { properties });
      return res.data;
    }

    // Lifecycle stage is set only on creation (HubSpot does not allow moving it backwards)
    properties.lifecyclestage = 'lead';
    const res = await api().post('/crm/v3/objects/contacts', { properties });
    return res.data;
  } catch (error) {
    console.error('HubSpot contact error:', error.response?.data || error.message);
    throw error;
  }
}

// Stage names -> stage IDs, read from the default deal pipeline (cached after first call)
let stageCache = null;

async function getStageIds() {
  if (stageCache) return stageCache;
  const res = await api().get('/crm/v3/pipelines/deals/default');
  const map = {};
  for (const stage of res.data.stages) {
    map[stage.label] = stage.id;
  }
  stageCache = map;
  return map;
}

// Create one deal for an application, linked to the contact, in the given stage
async function createDeal({ contactId, dealName, stageName }) {
  try {
    const stages = await getStageIds();
    const stageId = stages[stageName];
    if (!stageId) throw new Error(`HubSpot stage not found: ${stageName}`);

    const res = await api().post('/crm/v3/objects/deals', {
      properties: {
        dealname: dealName,
        pipeline: 'default',
        dealstage: stageId,
      },
      associations: [
        {
          to: { id: contactId },
          types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }],
        },
      ],
    });
    return res.data;
  } catch (error) {
    console.error('HubSpot create deal error:', error.response?.data || error.message);
    throw error;
  }
}

// Move an existing deal to another stage
async function updateDealStage(dealId, stageName) {
  try {
    const stages = await getStageIds();
    const stageId = stages[stageName];
    if (!stageId) throw new Error(`HubSpot stage not found: ${stageName}`);

    const res = await api().patch(`/crm/v3/objects/deals/${dealId}`, {
      properties: { dealstage: stageId },
    });
    return res.data;
  } catch (error) {
    console.error('HubSpot update deal error:', error.response?.data || error.message);
    throw error;
  }
}

// Read the current stage name of several deals at once. Returns { dealId: 'Stage Name' }
async function getDealStages(dealIds) {
  if (!dealIds || dealIds.length === 0) return {};
  try {
    const res = await api().post('/crm/v3/objects/deals/batch/read', {
      properties: ['dealstage'],
      inputs: dealIds.map((id) => ({ id: String(id) })),
    });

    const stages = await getStageIds();
    const idToLabel = {};
    for (const [label, id] of Object.entries(stages)) idToLabel[id] = label;

    const result = {};
    for (const deal of res.data.results) {
      result[deal.id] = idToLabel[deal.properties.dealstage] || null;
    }
    return result;
  } catch (error) {
    console.error('HubSpot read deals error:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  findContactByEmail,
  upsertContact,
  createOrUpdateContact: upsertContact, // old name, kept so existing code still works
  createDeal,
  updateDealStage,
  getDealStages,
  getStageIds,
};