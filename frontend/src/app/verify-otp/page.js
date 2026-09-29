'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import AuthShell from '../../components/AuthShell';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const digitClass = "w-11 h-12 text-center text-xl font-semibold text-[#1B2A4A] bg-white border border-[#1B2A4A]/20 rounded-xl focus:outline-none focus:border-[#C9A227] focus:shadow-[0_0_0_4px_rgba(201,162,39,0.15)] transition-all";
const verifyBtn = "w-full bg-[#1B2A4A] hover:bg-[#243758] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-white rounded-xl p-3.5 font-medium shadow-lg shadow-[#1B2A4A]/20";

function maskEmail(email) {
  const [name, domain] = email.split('@');
  if (!name || !domain) return email;
  const visible = name.slice(0, 3);
  return `${visible}${'*'.repeat(Math.max(name.length - 3, 3))}@${domain}`;
}

function VerifyOtpForm() {
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [cooldown, setCooldown] = useState(30);
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRefs = useRef([]);

  useEffect(() => {
    const emailFromUrl = searchParams.get('email');
    if (emailFromUrl) setEmail(emailFromUrl);
  }, [searchParams]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function handleDigitChange(index, value) {
    if (!/^[0-9]?$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function syncHubspotContact(accessToken) {
    try {
      await fetch(`${API_URL}/api/auth/hubspot-contact`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (err) {
      console.error('HubSpot contact sync failed:', err);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const otp = digits.join('');

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email'
    });

    if (error) {
      setLoading(false);
      setMessage(error.message);
      return;
    }

    const accessToken = data?.session?.access_token;
    if (accessToken) {
      await syncHubspotContact(accessToken);
    }

    setLoading(false);
    setMessage('Verified! Redirecting...');
    router.push('/dashboard');
  }

  async function handleResend() {
    if (cooldown > 0) return;
    setMessage('');
    const { error } = await supabase.auth.signInWithOtp({ email });
    setMessage(error ? error.message : 'Code resent. Check your email.');
    setCooldown(30);
  }

  return (
    <AuthShell>
      <div className="text-center">
        <a href="/signin" className="inline-block mb-5"><img src="/logo.png" alt="Medicaps University" className="h-20 mix-blend-multiply" /></a>

        <h2 className="font-display text-2xl font-semibold text-[#1B2A4A] mb-3">Enter your OTP</h2>

        <p className="text-sm text-[#2A2E35]/70 mb-1">Please enter the code sent to</p>
        <p className="text-sm font-medium text-[#C9A227] mb-2 break-all">{maskEmail(email)}</p>
        <p className="text-xs text-[#2A2E35]/50 mb-6">Please also check your spam or junk folder.</p>

        <form onSubmit={handleVerify}>
          <div className="flex justify-center gap-2 mb-6">
            {digits.map((digit, i) => (
              <input key={i} ref={(el) => (inputRefs.current[i] = el)} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={(e) => handleDigitChange(i, e.target.value)} onKeyDown={(e) => handleKeyDown(i, e)} className={digitClass} />
            ))}
          </div>

          <button type="submit" disabled={loading} className={verifyBtn}>
            {loading ? 'Verifying...' : 'Verify'}
          </button>

          {message && <p className="text-sm text-center mt-4 text-[#2A2E35]/80">{message}</p>}
        </form>

        <p className="text-sm text-[#2A2E35]/60 mt-6">
          Didn't get the code?{' '}
          {cooldown > 0 ? (
            <span className="text-[#2A2E35]/40">Resend in {cooldown}s</span>
          ) : (
            <button onClick={handleResend} className="text-[#C9A227] font-medium hover:underline">Send again</button>
          )}
        </p>
      </div>
    </AuthShell>
  );
}

export default function VerifyOtp() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#1B2A4A]" />}>
      <VerifyOtpForm />
    </Suspense>
  );
}