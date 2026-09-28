'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import { syncStage } from '../../../lib/hubspotSync';
import StepSidebar from '../../../components/StepSidebar';
import FormNav from '../../../components/FormNav';

const scaleMax = { out_of_100: 100, out_of_10: 10, out_of_4: 4 };
const scaleLabel = { out_of_100: '100', out_of_10: '10', out_of_4: '4.0' };

function getGradeError(value, scale) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return 'Enter a valid number, for example 3.5 or 85.';
  if (!scale) return '';
  if (Number(trimmed) > scaleMax[scale]) return `Score cannot be more than ${scaleLabel[scale]} for this scale.`;
  return '';
}

const qualifications = ['High School', "Bachelor's Degree", "Master's Degree"];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 60 }, (_, i) => currentYear - i);

function AcademicHistoryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appId = searchParams.get('app');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [form, setForm] = useState({
    highest_qualification: '',
    institution_name: '',
    institution_country: '',
    grade_value: '',
    grade_scale: '',
    year_of_completion: '',
    english_test_type: '',
    english_test_score: '',
  });

  const gradeError = getGradeError(form.grade_value, form.grade_scale);

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
        .from('academic_history')
        .select('*')
        .eq('application_id', appId)
        .limit(1);

      if (existing && existing.length > 0) {
        const row = existing[0];
        setForm({
          highest_qualification: row.highest_qualification || '',
          institution_name: row.institution_name || '',
          institution_country: row.institution_country || '',
          grade_value: row.grade_value || '',
          grade_scale: row.grade_scale || '',
          year_of_completion: row.year_of_completion ? String(row.year_of_completion) : '',
          english_test_type: row.english_test_type || '',
          english_test_score: row.english_test_score || '',
        });
      }
    }
    loadData();
  }, [router, appId]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage('');

    if (gradeError) {
      setMessage('Please fix the Grade / GPA before continuing.');
      return;
    }

    setLoading(true);

    // Replace any earlier saved row so re-saving never creates duplicates
    await supabase.from('academic_history').delete().eq('application_id', appId);

    const { error } = await supabase
      .from('academic_history')
      .insert([{
        application_id: appId,
        ...form,
        grade_value: form.grade_value.trim(),
        year_of_completion: form.year_of_completion ? Number(form.year_of_completion) : null,
      }]);

    if (error) {
      setLoading(false);
      setMessage(error.message);
      return;
    }

    // HubSpot: move the deal to Academic Info Done
    await syncStage(appId, 'Academic Info Done');

    setLoading(false);
    router.push(`/apply/documents?app=${appId}`);
  }

  const label = "block mb-1.5 text-sm font-medium text-[#2A2E35]";
  const input = "w-full border border-[#1B2A4A]/20 rounded-lg p-3 text-[#2A2E35] focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-[#C9A227] transition";
  const inputError = "w-full border border-red-500 rounded-lg p-3 text-[#2A2E35] focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-500 transition";

  return (
    <div className="min-h-screen bg-[#F7F5F1]">
      <FormNav />

      <div className="flex flex-col md:flex-row">
        <StepSidebar current="academic-history" />

        <div className="flex-1 px-6 py-10 md:px-16 md:py-14">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-[#C9A227] mb-2">Step 3 of 4</p>
            <h1 className="font-display text-3xl font-semibold text-[#1B2A4A] mb-2">Academic History</h1>
            <p className="text-sm text-[#2A2E35]/70 mb-8">Share your most recent academic qualification.</p>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={label}>Highest Qualification</label>
                <select name="highest_qualification" value={form.highest_qualification} onChange={handleChange} required className={input}>
                  <option value="">Select</option>
                  {qualifications.map((q) => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={label}>Institution Name</label>
                <input name="institution_name" value={form.institution_name} onChange={handleChange} required className={input} />
              </div>

              <div>
                <label className={label}>Institution Country</label>
                <input name="institution_country" value={form.institution_country} onChange={handleChange} required className={input} />
              </div>

              <div>
                <label className={label}>Year of Completion</label>
                <select name="year_of_completion" value={form.year_of_completion} onChange={handleChange} required className={input}>
                  <option value="">Select</option>
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={label}>Grade / GPA</label>
                <input name="grade_value" value={form.grade_value} onChange={handleChange} required inputMode="decimal" className={gradeError ? inputError : input} />
                {gradeError && <p className="mt-1.5 text-xs text-red-600">{gradeError}</p>}
              </div>

              <div>
                <label className={label}>Grade Scale</label>
                <select name="grade_scale" value={form.grade_scale} onChange={handleChange} required className={input}>
                  <option value="">Select</option>
                  <option value="out_of_100">Out of 100</option>
                  <option value="out_of_10">Out of 10</option>
                  <option value="out_of_4">Out of 4.0</option>
                </select>
              </div>

              <div>
                <label className={label}>English Proficiency Test</label>
                <select name="english_test_type" value={form.english_test_type} onChange={handleChange} className={input}>
                  <option value="">None</option>
                  <option value="ielts">IELTS</option>
                  <option value="toefl">TOEFL</option>
                </select>
              </div>

              {form.english_test_type && (
                <div>
                  <label className={label}>Test Score</label>
                  <input name="english_test_score" value={form.english_test_score} onChange={handleChange} className={input} />
                </div>
              )}

              <div className="md:col-span-2 mt-4 flex justify-end">
                <button type="submit" disabled={loading || !!gradeError} className="bg-[#1B2A4A] hover:bg-[#243758] transition text-white rounded-xl px-8 py-3.5 font-medium disabled:opacity-60">
                  {loading ? 'Saving...' : 'Next: Documents'}
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

export default function AcademicHistory() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F5F1]" />}>
      <AcademicHistoryForm />
    </Suspense>
  );
}