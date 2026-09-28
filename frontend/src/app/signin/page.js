'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import AuthShell from '../../components/AuthShell';

const inputWrap = "flex items-center gap-3 border border-[#1B2A4A]/20 rounded-xl px-4 py-3 mb-5 bg-white focus-within:border-[#C9A227] focus-within:shadow-[0_0_0_4px_rgba(201,162,39,0.15)] transition-all";
const inputField = "w-full outline-none text-[15px] text-[#2A2E35] placeholder:text-[#2A2E35]/40 bg-transparent";
const signInBtn = "group w-full bg-[#1B2A4A] hover:bg-[#243758] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-white rounded-xl p-3.5 font-medium shadow-lg shadow-[#1B2A4A]/20 flex items-center justify-center gap-2";
const newApplicantBox = "flex items-center justify-between border border-[#1B2A4A]/15 rounded-xl p-3.5 hover:bg-[#1B2A4A]/[0.03] transition";
const createBtn = "text-sm font-medium text-[#1B2A4A] border border-[#1B2A4A]/30 rounded-lg px-4 py-2 hover:bg-[#1B2A4A] hover:text-white transition";

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  async function handleSignIn(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false }
    });

    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes('signups not allowed')) {
        setMessage('This email is not registered. Please create an account first.');
      } else {
        setMessage(error.message);
      }
    } else {
      setMessage('OTP sent! Redirecting...');
      setTimeout(() => {
        router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
      }, 1000);
    }
  }

  return (
    <AuthShell>
      <div className="flex justify-center mb-6">
        <a href="/signin" className="inline-block"><img src="/logo.png" alt="Medicaps University" className="h-24 mix-blend-multiply" /></a>
      </div>

      <h2 className="font-display text-2xl font-semibold text-[#1B2A4A] mb-1.5 text-center">Sign In</h2>
      <p className="text-sm text-[#2A2E35]/70 mb-6 text-center">Enter your registered email address to receive an OTP.</p>

      <form onSubmit={handleSignIn}>
        <label className="block mb-2 text-sm font-medium text-[#2A2E35]">Email</label>
        <div className={inputWrap}>
          <Mail size={18} className="text-[#1B2A4A]/50 shrink-0" />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="your@email.com" className={inputField} />
        </div>

        <button type="submit" disabled={loading} className={signInBtn}>
          {loading ? 'Sending OTP...' : (
            <>
              Sign In
              <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
            </>
          )}
        </button>

        {message && <p className="text-sm text-center mt-4 text-[#2A2E35]/80">{message}</p>}
      </form>

      <div className="flex items-center my-5">
        <hr className="flex-1 border-[#1B2A4A]/10" />
        <span className="px-3 text-[#2A2E35]/50 text-sm">or</span>
        <hr className="flex-1 border-[#1B2A4A]/10" />
      </div>

      <div className={newApplicantBox}>
        <span className="text-sm text-[#2A2E35]">New Applicant?</span>
        <a href="/signup" className={createBtn}>Create an Account</a>
      </div>
    </AuthShell>
  );
}