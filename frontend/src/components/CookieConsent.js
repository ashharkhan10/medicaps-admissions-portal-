'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

const HUB_ID = process.env.NEXT_PUBLIC_HUBSPOT_ID;
const KEY = 'medicaps_cookie_consent';

const bannerClass = "fixed bottom-6 left-6 right-24 md:right-auto md:max-w-md bg-white rounded-2xl shadow-2xl border border-[#1B2A4A]/10 p-5 z-40 animate-[fadeInUp_0.3s_ease-out]";
const acceptClass = "bg-[#1B2A4A] hover:bg-[#243758] transition text-white rounded-lg px-4 py-2 text-sm font-medium";
const declineClass = "border border-[#1B2A4A]/25 text-[#1B2A4A] hover:bg-[#1B2A4A]/5 transition rounded-lg px-4 py-2 text-sm font-medium";

function loadHubspotScript() {
  if (document.getElementById('hs-script-loader')) return;
  const script = document.createElement('script');
  script.id = 'hs-script-loader';
  script.async = true;
  script.defer = true;
  script.src = `https://js.hs-scripts.com/${HUB_ID}.js`;
  document.body.appendChild(script);
}

export default function CookieConsent() {
  const [consent, setConsent] = useState(null); // null = still checking
  const pathname = usePathname();
  const firstView = useRef(true);

  // Read the saved choice once
  useEffect(() => {
    let saved = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch (err) {}
    setConsent(saved || 'unset');
  }, []);

  // Track each page the visitor opens, only after they accepted
  useEffect(() => {
    if (consent !== 'accepted' || !HUB_ID) return;

    async function track() {
      window._hsq = window._hsq || [];

      // Logged-in students are linked to their HubSpot contact by email
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user?.email;
      if (email) window._hsq.push(['identify', { email }]);

      if (firstView.current) {
        // The script records the first page itself when it loads
        firstView.current = false;
        loadHubspotScript();
        return;
      }

      window._hsq.push(['setPath', pathname]);
      window._hsq.push(['trackPageView']);
    }
    track();
  }, [consent, pathname]);

  function choose(value) {
    try {
      localStorage.setItem(KEY, value);
    } catch (err) {}
    setConsent(value);
  }

  if (consent !== 'unset') return null;

  return (
    <div className={bannerClass}>
      <p className="font-medium text-[#1B2A4A] text-sm mb-1">We value your privacy</p>
      <p className="text-xs text-[#2A2E35]/70 leading-relaxed mb-4">We use cookies to understand how visitors use this portal and to improve your experience. You can accept or decline.</p>
      <div className="flex gap-2 justify-end">
        <button onClick={() => choose('declined')} className={declineClass}>Decline</button>
        <button onClick={() => choose('accepted')} className={acceptClass}>Accept</button>
      </div>
    </div>
  );
}