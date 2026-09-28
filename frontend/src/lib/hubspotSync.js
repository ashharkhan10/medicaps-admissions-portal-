// Tells the backend to create or move this application's HubSpot deal.
// Never blocks the student: if HubSpot fails, the form still continues.

import { supabase } from './supabaseClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function syncStage(applicationId, stage) {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token || !applicationId) return;

    await fetch(`${API_URL}/api/application/hubspot-stage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ applicationId, stage }),
    });
  } catch (err) {
    console.error('HubSpot stage sync failed:', err);
  }
}