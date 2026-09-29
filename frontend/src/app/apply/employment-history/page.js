'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import DateSelect from '../../../components/DateSelect';
import StepSidebar from '../../../components/StepSidebar';
import FormNav from '../../../components/FormNav';

const emptyForm = {
  no_experience: false,
  employer_name: '',
  job_title: '',
  currently_employed: false,
  start_date: '',
  end_date: '',
};

const noExpBox = "md:col-span-2 flex items-start gap-3 border rounded-xl p-4 cursor-pointer transition";

function EmploymentHistoryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appId = searchParams.get('app');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState(emptyForm);

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
        .select('no_experience, employer_name, job_title, currently_employed, start_date, end_date')
        .eq('application_id', appId)
        .limit(1);

      if (existing && existing.length > 0) {
        const row = existing[0];
        setForm({
          no_experience: !!row.no_experience,
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

    if (name === 'no_experience') {
      // Ticking "no experience" clears the job details
      setForm(checked ? { ...emptyForm, no_experience: true } : { ...form, no_experience: false });
      return;
    }

    if (name === 'currently_employed' && checked) {
      setForm({ ...form, currently_employed: true, end_date: '' });
      return;
    }

    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage('');

    if (!form.no_experience) {
      if (!form.start_date) {
        setMessage('Please select a complete start date.');
        return;
      }
      if (!form.currently_employed && !form.end_date) {
        setMessage('Please select a complete end date, or tick "Currently Employed".');
        return;
      }
    }

    setLoading(true);

    // Replace any earlier saved row so re-saving never creates duplicates
    await supabase.from('employment_history').delete().eq('application_id', appId);

    const row = form.no_experience
      ? { application_id: appId, no_experience: true, employer_name: null, job_title: null, currently_employed: false, start_date: null, end_date: null }
      : { application_id: appId, ...form, no_experience: false, end_date: form.end_date || null };

    const { error } = await supabase.from('employment_history').insert([row]);

    setLoading(false);

    if (error) {
      setMessage(error.message);
    } else {
      router.push(`/apply/academic-history?app=${appId}`);
    }
  }

  const label = "block mb-1.5 text-sm font-medium text-[#2A2E35]";
  const input = "w-full border border-[#1B2A4A]/20 rounded-lg p-3 text-[#2A2E35] focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-[#C9A227] transition";
  const noExpState = form.no_experience ? 'border-[#C9A227] bg-[#C9A227]/10' : 'border-[#1B2A4A]/15 bg-white hover:border-[#C9A227]/60';

  return (
    <div className="min-h-screen bg-[#F7F5F1]">
      <FormNav />

      <div className="flex flex-col md:flex-row">
        <StepSidebar current="program-of-study" />

        <div className="flex-1 px-6 py-10 md:px-16 md:py-14">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-[#C9A227] mb-2">Additional Step · Postgraduate</p>
            <h1 className="font-display text-3xl font-semibold text-[#1B2A4A] mb-2">Employment History</h1>
            <p className="text-sm text-[#2A2E35]/70 mb-8">Tell us about your current or most recent role. If you have not worked yet, tick the box below.</p>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <label className={`${noExpBox} ${noExpState}`}>
                <input type="checkbox" name="no_experience" checked={form.no_experience} onChange={handleTextChange} className="mt-0.5 w-4 h-4 accent-[#C9A227]" />
                <span>
                  <span className="block text-sm font-medium text-[#1B2A4A]">I don't have any work experience</span>
                  <span className="block text-xs text-[#2A2E35]/60 mt-0.5">For example, if you are applying straight after your bachelor's degree.</span>
                </span>
              </label>

              {!form.no_experience && (
                <>
                  <div>
                    <label className={label}>Employer Name</label>
                    <input name="employer_name" value={form.employer_name} onChange={handleTextChange} required className={input} />
                  </div>

                  <div>
                    <label className={label}>Job Title</label>
                    <input name="job_title" value={form.job_title} onChange={handleTextChange} required className={input} />
                  </div>

                  <div className="md:col-span-2 flex items-center gap-2">
                    <input type="checkbox" id="currently_employed" name="currently_employed" checked={form.currently_employed} onChange={handleTextChange} className="w-4 h-4 accent-[#C9A227]" />
                    <label htmlFor="currently_employed" className="text-sm text-[#2A2E35]">Currently Employed</label>
                  </div>

                  <div>
                    <label className={label}>Start Date</label>
                    <DateSelect value={form.start_date} onChange={(val) => setForm({ ...form, start_date: val })} required />
                  </div>

                  <div>
                    <label className={label}>End Date {form.currently_employed && '(not required)'}</label>
                    <DateSelect value={form.end_date} onChange={(val) => setForm({ ...form, end_date: val })} required={!form.currently_employed} disabled={form.currently_employed} />
                  </div>
                </>
              )}

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