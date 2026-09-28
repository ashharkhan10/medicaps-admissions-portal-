'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Phone } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import AuthShell from '../../components/AuthShell';

const inputWrap = "flex items-center gap-3 border border-[#1B2A4A]/20 rounded-xl px-4 py-3 bg-white focus-within:border-[#C9A227] focus-within:shadow-[0_0_0_4px_rgba(201,162,39,0.15)] transition-all";
const inputField = "w-full outline-none text-[15px] text-[#2A2E35] placeholder:text-[#2A2E35]/40 bg-transparent";
const iconStyle = "text-[#1B2A4A]/50 shrink-0";
const signUpBtn = "w-full bg-[#1B2A4A] hover:bg-[#243758] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-white rounded-xl p-3.5 font-medium shadow-lg shadow-[#1B2A4A]/20 mt-1";
const signInLink = "block text-center border border-[#1B2A4A]/25 text-[#1B2A4A] rounded-xl p-3.5 text-sm font-medium hover:bg-[#1B2A4A] hover:text-white transition";

export default function SignUp() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  async function handleSignUp(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        data: { first_name: firstName, last_name: lastName, mobile }
      }
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('OTP sent! Redirecting...');
      setTimeout(() => {
        router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
      }, 1000);
    }
  }

  return (
    <AuthShell>
      <div className="flex justify-center mb-5">
        <a href="/signin" className="inline-block"><img src="/logo.png" alt="Medicaps University" className="h-20 mix-blend-multiply" /></a>
      </div>

      <h2 className="font-display text-2xl font-semibold text-[#1B2A4A] mb-1.5 text-center">Sign Up</h2>
      <p className="text-sm text-[#2A2E35]/70 mb-5 text-center">Provide your details as per your passport.</p>

      <form onSubmit={handleSignUp} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className={inputWrap}>
            <User size={18} className={iconStyle} />
            <input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className={inputField} />
          </div>
          <div className={inputWrap}>
            <input type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required className={inputField} />
          </div>
        </div>

        <div className={inputWrap}>
          <Phone size={18} className={iconStyle} />
          <input type="text" placeholder="Mobile Number" value={mobile} onChange={(e) => setMobile(e.target.value)} required className={inputField} />
        </div>

        <div className={inputWrap}>
          <Mail size={18} className={iconStyle} />
          <input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputField} />
        </div>

        <button type="submit" disabled={loading} className={signUpBtn}>
          {loading ? 'Sending OTP...' : 'Sign Up'}
        </button>

        {message && <p className="text-sm text-center mt-2 text-[#2A2E35]/80">{message}</p>}
      </form>

      <div className="flex items-center my-5">
        <hr className="flex-1 border-[#1B2A4A]/10" />
        <span className="px-3 text-[#2A2E35]/50 text-sm">or</span>
        <hr className="flex-1 border-[#1B2A4A]/10" />
      </div>

      <a href="/signin" className={signInLink}>Already have an account? Sign In</a>
    </AuthShell>
  );
}