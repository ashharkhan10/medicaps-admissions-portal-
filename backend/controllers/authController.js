// Supabase Auth handles the actual OTP send/verify (from the frontend directly).
// This controller only handles our extra logic: reading the profile and the HubSpot contact.

const supabase = require('../config/supabaseClient');
const { upsertContact } = require('../config/hubspotClient');

// Get the logged-in user's own profile
async function getProfile(req, res) {
  const userId = req.user.id;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    return res.status(404).json({ error: 'Profile not found.' });
  }

  return res.status(200).json({ profile: data });
}

// Creates (or updates) the HubSpot contact for the logged-in user.
// Details come from the verified Supabase user, never from the request body.
async function hubspotContact(req, res) {
  const user = req.user;
  const meta = user.user_metadata || {};

  try {
    const contact = await upsertContact({
      email: user.email,
      firstName: meta.first_name,
      lastName: meta.last_name,
      phone: meta.mobile,
    });
    return res.status(200).json({ success: true, contactId: contact.id });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to sync contact with HubSpot' });
  }
}

module.exports = { getProfile, hubspotContact };