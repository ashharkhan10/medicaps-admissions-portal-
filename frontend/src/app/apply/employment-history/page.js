'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import DateSelect from '../../../components/DateSelect';
import StepSidebar from '../../../components/StepSidebar';
import FormNav from '../../../components/FormNav';

function EmploymentHistoryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appId = searchParams.get('app');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [form, setForm] = useState({
    employer_name: '',
    job_title: '',
    currently_employed: false,
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    async function loadData() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push('/signin');
        return;
      }
      if (!appId) {
        router.push('/dashboard');
        return;
      }

      const { data: existing } = await supabase
        .from('employment_history')
        .select('employer_name, job_title, currently_employed, start_date, end_date')
        .eq('application_id', appId)
        .limit(1);

      if (existing && existing.length > 0) {
        const row = existing[0];
        setForm({
          employer_name: row.employer_name || '',
          job_title: row.job_title || '',
          currently_employed: !!row.currently_employed,
          start_date: row.start_date || '',
          end_date: row.end_date || '',
        });
      }
    }
    loadData();
  }, [router, appId]);

  function handleTextChange(e) {
    const { name, value, type, checked } = e.target;
    if (name === 'currently_employed' && checked) {
      setForm({ ...form, currently_employed: true, end_date: '' });
    } else {
      setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // Replace any earlier saved row so re-saving never creates duplicates
    await supabase.from('employment_history').delete().eq('application_id', appId);

    const { error } = await supabase
      .from('employment_history')
      .insert([{
        application_id: appId,
        ...form,
        end_date: form.end_date || null,
      }]);

    setLoading(false);

    if (error) {
      setMessage(error.message);
    } else {
      router.push(`/apply/academic-history?app=${appId}`);
    }
  }

  const label = "block mb-1.5 text-sm font-medium text-[#2A2E35]";
  const input = "w-full border border-[#1B2A4A]/20 rounded-lg p-3 text-[#2A2E35] focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-[#C9A227] transition";

  return (
    <div className="min-h-screen bg-[#F7F5F1]">
      <FormNav />

      <div className="flex flex-col md:flex-row">
        <StepSidebar current="program-of-study" />

        <div className="flex-1 px-6 py-10 md:px-16 md:py-14">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-[#C9A227] mb-2">Additional Step · Postgraduate</p>
            <h1 className="font-display text-3xl font-semibold text-[#1B2A4A] mb-2">Employment History</h1>
            <p className="text-sm text-[#2A2E35]/70 mb-8">Tell us about your current or most recent role.</p>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={label}>Employer Name</label>
                <input name="employer_name" value={form.employer_name} onChange={handleTextChange} required className={input} />
              </div>

              <div>
                <label className={label}>Job Title</label>
                <input name="job_title" value={form.job_title} onChange={handleTextChange} required className={input} />
              </div>

              <div className="md:col-span-2 flex items-center gap-2">
                <input type="checkbox" name="currently_employed" checked={form.currently_employed} onChange={handleTextChange} className="w-4 h-4 accent-[#C9A227]" />
                <label className="text-sm text-[#2A2E35]">Currently Employed</label>
              </div>

              <div>
                <label className={label}>Start Date</label>
                <DateSelect value={form.start_date} onChange={(val) => setForm({ ...form, start_date: val })} required />
              </div>

              <div>
                <label className={label}>End Date {form.currently_employed && '(not required)'}</label>
                <DateSelect value={form.end_date} onChange={(val) => setForm({ ...form, end_date: val })} required={!form.currently_employed} disabled={form.currently_employed} />
              </div>

              <div className="md:col-span-2 mt-4 flex justify-end">
                <button type="submit" disabled={loading} className="bg-[#1B2A4A] hover:bg-[#243758] transition text-white rounded-xl px-8 py-3.5 font-medium">
                  {loading ? 'Saving...' : 'Next'}
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

export default function EmploymentHistory() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F5F1]" />}>
      <EmploymentHistoryForm />
    </Suspense>
  );
}