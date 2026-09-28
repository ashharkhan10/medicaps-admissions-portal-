'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import DateSelect from '../../../components/DateSelect';
import StepSidebar from '../../../components/StepSidebar';
import FormNav from '../../../components/FormNav';

const countryCodes = [
  { code: '+971', label: 'UAE' },
  { code: '+91', label: 'India' },
  { code: '+1', label: 'USA' },
  { code: '+44', label: 'UK' },
  { code: '+61', label: 'Australia' },
];

const fields = [
  'first_name', 'last_name', 'date_of_birth', 'gender', 'nationality', 'email',
  'country_code', 'mobile_number', 'address_country', 'address_city', 'full_address',
  'emergency_contact_name', 'emergency_contact_phone',
];

function PersonalInfoForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appId = searchParams.get('app'); // present when editing from an existing application
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    nationality: '',
    email: '',
    country_code: '+971',
    mobile_number: '',
    address_country: '',
    address_city: '',
    full_address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
  });

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push('/signin');
        return;
      }
      const user = data.session.user;
      setUserId(user.id);

      // Load the saved profile, if there is one
      const { data: profile } = await supabase
        .from('profiles')
        .select(fields.join(', '))
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile) {
        const loaded = {};
        fields.forEach((f) => {
          loaded[f] = profile[f] || '';
        });
        if (!loaded.country_code) loaded.country_code = '+971';
        loaded.email = user.email;
        setForm(loaded);
      } else {
        // New applicant: prefill from the sign-up details
        const meta = user.user_metadata || {};
        setForm((f) => ({
          ...f,
          email: user.email,
          first_name: meta.first_name || '',
          last_name: meta.last_name || '',
          mobile_number: meta.mobile || '',
        }));
      }
    }
    loadUser();
  }, [router]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabase
      .from('profiles')
      .upsert([{ user_id: userId, ...form }], { onConflict: 'user_id' });

    setLoading(false);

    if (error) {
      setMessage(error.message);
    } else if (appId) {
      router.push(`/apply/program-of-study?app=${appId}`);
    } else {
      router.push('/apply/program-of-study');
    }
  }

  const label = "block mb-1.5 text-sm font-medium text-[#2A2E35]";
  const input = "w-full border border-[#1B2A4A]/20 rounded-lg p-3 text-[#2A2E35] focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-[#C9A227] transition";
  const readOnlyInput = "w-full border border-[#1B2A4A]/10 bg-[#1B2A4A]/5 rounded-lg p-3 text-[#2A2E35]/60";

  return (
    <div className="min-h-screen bg-[#F7F5F1]">
      <FormNav />

      <div className="flex flex-col md:flex-row">
        <StepSidebar current="personal-info" />

        <div className="flex-1 px-6 py-10 md:px-16 md:py-14">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-[#C9A227] mb-2">Step 1 of 4</p>
            <h1 className="font-display text-3xl font-semibold text-[#1B2A4A] mb-2">Personal Information</h1>
            <p className="text-sm text-[#2A2E35]/70 mb-8">Provide your details exactly as they appear on your passport.</p>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={label}>First Name</label>
                <input name="first_name" value={form.first_name} onChange={handleChange} required className={input} />
              </div>

              <div>
                <label className={label}>Last Name</label>
                <input name="last_name" value={form.last_name} onChange={handleChange} required className={input} />
              </div>

              <div>
                <label className={label}>Date of Birth</label>
                <DateSelect value={form.date_of_birth} onChange={(val) => setForm({ ...form, date_of_birth: val })} required />
              </div>

              <div>
                <label className={label}>Gender (optional)</label>
                <select name="gender" value={form.gender} onChange={handleChange} className={input}>
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className={label}>Nationality</label>
                <input name="nationality" value={form.nationality} onChange={handleChange} required className={input} />
              </div>

              <div>
                <label className={label}>Email</label>
                <input type="email" name="email" value={form.email} readOnly className={readOnlyInput} />
              </div>

              <div>
                <label className={label}>Mobile Number</label>
                <div className="flex gap-2">
                  <select name="country_code" value={form.country_code} onChange={handleChange} className="border border-[#1B2A4A]/20 rounded-lg p-3 text-[#2A2E35]">
                    {countryCodes.map((c) => (
                      <option key={c.code} value={c.code}>{c.code} {c.label}</option>
                    ))}
                  </select>
                  <input name="mobile_number" value={form.mobile_number} onChange={handleChange} required className={input} />
                </div>
              </div>

              <div>
                <label className={label}>Address Country</label>
                <input name="address_country" value={form.address_country} onChange={handleChange} required className={input} />
              </div>

              <div>
                <label className={label}>Address City</label>
                <input name="address_city" value={form.address_city} onChange={handleChange} required className={input} />
              </div>

              <div className="md:col-span-2">
                <label className={label}>Full Address</label>
                <textarea name="full_address" value={form.full_address} onChange={handleChange} required rows={2} className={input} />
              </div>

              <div>
                <label className={label}>Emergency Contact Name</label>
                <input name="emergency_contact_name" value={form.emergency_contact_name} onChange={handleChange} required className={input} />
              </div>

              <div>
                <label className={label}>Emergency Contact Phone</label>
                <input name="emergency_contact_phone" value={form.emergency_contact_phone} onChange={handleChange} required className={input} />
              </div>

              <div className="md:col-span-2 mt-4 flex justify-end">
                <button type="submit" disabled={loading} className="bg-[#1B2A4A] hover:bg-[#243758] transition text-white rounded-xl px-8 py-3.5 font-medium">
                  {loading ? 'Saving...' : 'Next: Program of Study'}
                </button>
              </div>
              {message && <p className="md:col-span-2 text-sm text-center text-red-600">{message}</p>}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PersonalInfo() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F5F1]" />}>
      <PersonalInfoForm />
    </Suspense>
  );
}