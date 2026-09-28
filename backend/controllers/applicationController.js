// Handles application-related backend logic.

const supabase = require('../config/supabaseClient');
const { upsertContact, createDeal, updateDealStage, getDealStages } = require('../config/hubspotClient');

const STAGES = ['Program Selected', 'Academic Info Done', 'Documents Pending', 'Submitted'];

// HubSpot stage name -> value saved in applications.decision
const DECISIONS = {
  'Under Review': 'under_review',
  'Accepted': 'accepted',
  'Rejected': 'rejected',
};

function formatAppNumber(n) {
  if (n === null || n === undefined) return '';
  const s = String(n);
  return s.startsWith('MED-') ? s : `MED-2026-${s.padStart(6, '0')}`;
}

// Creates the application's deal (first call) or moves it to the given stage.
// Only works on the logged-in user's own application.
async function hubspotStage(req, res) {
  const { applicationId, stage } = req.body;

  if (!applicationId || !STAGES.includes(stage)) {
    return res.status(400).json({ error: 'Invalid application or stage.' });
  }

  const { data: app, error } = await supabase
    .from('applications')
    .select('id, user_id, course, program_level, application_number, hubspot_deal_id')
    .eq('id', applicationId)
    .eq('user_id', req.user.id)
    .single();

  if (error || !app) {
    return res.status(404).json({ error: 'Application not found.' });
  }

  // Every saved step counts as activity for "Last saved" on the dashboard
  await supabase.from('applications').update({ updated_at: new Date().toISOString() }).eq('id', app.id);

  try {
    if (!app.hubspot_deal_id) {
      const meta = req.user.user_metadata || {};
      const contact = await upsertContact({
        email: req.user.email,
        firstName: meta.first_name,
        lastName: meta.last_name,
        phone: meta.mobile,
        course: app.course,
        programLevel: app.program_level,
      });

      const appNo = formatAppNumber(app.application_number);
      const dealName = `${appNo || req.user.email} - ${app.course}`;

      const deal = await createDeal({ contactId: contact.id, dealName, stageName: stage });
      await supabase.from('applications').update({ hubspot_deal_id: deal.id }).eq('id', app.id);

      console.log('HubSpot deal created:', dealName, 'stage:', stage);
      return res.status(200).json({ success: true, dealId: deal.id });
    }

    // Editing Program of Study again should not move an existing deal backwards
    if (stage !== 'Program Selected') {
      await updateDealStage(app.hubspot_deal_id, stage);
      console.log('HubSpot deal moved:', app.hubspot_deal_id, 'stage:', stage);
    }

    return res.status(200).json({ success: true, dealId: app.hubspot_deal_id });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update HubSpot deal' });
  }
}

// Reads the logged-in user's deal stages from HubSpot and saves any decision
// (Under Review / Accepted / Rejected) into applications.decision.
async function hubspotStatus(req, res) {
  const { data: apps, error } = await supabase
    .from('applications')
    .select('id, hubspot_deal_id, decision')
    .eq('user_id', req.user.id)
    .not('hubspot_deal_id', 'is', null);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  try {
    const stageByDeal = await getDealStages(apps.map((a) => a.hubspot_deal_id));
    let updated = 0;

    for (const app of apps) {
      const label = stageByDeal[String(app.hubspot_deal_id)];
      const decision = DECISIONS[label] || null;

      if (decision !== (app.decision || null)) {
        await supabase.from('applications').update({ decision }).eq('id', app.id);
        updated++;
        console.log('Decision synced:', app.id, '->', decision);
      }
    }

    return res.status(200).json({ success: true, updated });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to read HubSpot status' });
  }
}

module.exports = { hubspotStage, hubspotStatus };