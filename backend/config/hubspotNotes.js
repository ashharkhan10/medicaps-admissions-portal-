// Saves chatbot questions as notes on the student's HubSpot contact.

const axios = require('axios');
require('dotenv').config();
const { findContactByEmail, upsertContact } = require('./hubspotClient');

function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function logChatQuestion(email, question, answer) {
  let contact = await findContactByEmail(email);
  if (!contact) contact = await upsertContact({ email });

  const body = `<p><strong>Chatbot question:</strong> ${escapeHtml(question)}</p><p><strong>Assistant reply:</strong> ${escapeHtml(answer)}</p>`;

  await axios.post(
    'https://api.hubapi.com/crm/v3/objects/notes',
    {
      properties: { hs_timestamp: new Date().toISOString(), hs_note_body: body },
      associations: [
        {
          to: { id: contact.id },
          types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 202 }],
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );
}

module.exports = { logChatQuestion };