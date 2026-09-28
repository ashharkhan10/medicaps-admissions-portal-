'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import { syncStage } from '../../../lib/hubspotSync';
import StepSidebar from '../../../components/StepSidebar';
import FormNav from '../../../components/FormNav';

const undergraduateCourses = [
  'BBA - Business Administration',
  'B.Tech - Computer Science Engineering',
  'B.Tech - Mechanical Engineering',
  'B.Tech - Electronics Engineering',
  'B.Com - Commerce',
  'BA - English',
  'B.Sc - Computer Science',
  'BCA - Computer Applications',
];

const postgraduateCourses = [
  'MBA - Business Administration',
  'M.Tech - Computer Science Engineering',
  'M.Tech - Mechanical Engineering',
  'M.Com - Commerce',
  'MA - English',
  'M.Sc - Computer Science',
  'MCA - Computer Applications',
];

function ProgramOfStudyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appId = searchParams.get('app'); // present only when editing an existing draft
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [form, setForm] = useState({
    program_level: '',
    course: '',
    intake_term: '',
    mode_of_study: '',
    preferred_campus: '',
  });

  useEffect(() => {
    async function loadData() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push('/signin');
        return;
      }
      setUserId(data.session.user.id);

      if (appId) {
        const { data: existing } = await supabase
          .from('applications')
          .select('program_level, course, intake_term, mode_of_study, preferred_campus')
          .eq('id', appId)
          .single();

        if (existing) {
          setForm({
            program_level: existing.program_level || '',
            course: existing.course || '',
            intake_term: existing.intake_term || '',
            mode_of_study: existing.mode_of_study || '',
            preferred_campus: existing.preferred_campus || '',
          });
        }
      }
    }
    loadData();
  }, [router, appId]);

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === 'program_level') {
      setForm({ ...form, program_level: value, course: '' });
    } else {
      setForm({ ...form, [name]: value });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // Rule 1: only one unfinished application at a time
    if (!appId) {
      const { data: drafts } = await supabase
        .from('applications')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'draft');

      if (drafts && drafts.length > 0) {
        setMessage('You already have an unfinished application. Please continue it from your dashboard before starting a new one.');
        setLoading(false);
        return;
      }
    }

    // Rule 2: the same course cannot be applied to twice
    let duplicateQuery = supabase
      .from('applications')
      .select('id')
      .eq('user_id', userId)
      .eq('course', form.course);
    if (appId) duplicateQuery = duplicateQuery.neq('id', appId);

    const { data: duplicates } = await duplicateQuery;
    if (duplicates && duplicates.length > 0) {
      setMessage('You have already applied to this course. Please choose a different program.');
      setLoading(false);
      return;
    }

    let currentAppId = appId;

    if (appId) {
      const { error } = await supabase.from('applications').update({ ...form }).eq('id', appId);
      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }
    } else {
      const { data: created, error } = await supabase
        .from('applications')
        .insert([{ user_id: userId, ...form, status: 'draft' }])
        .select('id')
        .single();

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }
      currentAppId = created.id;
    }

    // HubSpot: creates the deal on first save (never moves an existing deal backwards)
    await syncStage(currentAppId, 'Program Selected');

    setLoading(false);

    if (form.program_level === 'postgraduate') {
      router.push(`/apply/employment-history?app=${currentAppId}`);
    } else {
      router.push(`/apply/academic-history?app=${currentAppId}`);
    }
  }

  const courseOptions = form.program_level === 'postgraduate' ? postgraduateCourses : undergraduateCourses;

  const label = "block mb-1.5 text-sm font-medium text-[#2A2E35]";
  const input = "w-full border border-[#1B2A4A]/20 rounded-lg p-3 text-[#2A2E35] focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-[#C9A227] transition";

  return (
    <div className="min-h-screen bg-[#F7F5F1]">
      <FormNav />

      <div className="flex flex-col md:flex-row">
        <StepSidebar current="program-of-study" />

        <div className="flex-1 px-6 py-10 md:px-16 md:py-14">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-[#C9A227] mb-2">Step 2 of 4</p>
            <h1 className="font-display text-3xl font-semibold text-[#1B2A4A] mb-2">Program of Study</h1>
            <p className="text-sm text-[#2A2E35]/70 mb-8">Tell us which program you'd like to apply for.</p>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={label}>Program Level</label>
                <select name="program_level" value={form.program_level} onChange={handleChange} required className={input}>
                  <option value="">Select</option>
                  <option value="undergraduate">Undergraduate</option>
                  <option value="postgraduate">Postgraduate</option>
                </select>
              </div>

              <div>
                <label className={label}>Course</label>
                <select name="course" value={form.course} onChange={handleChange} required disabled={!form.program_level} className={`${input} disabled:bg-[#1B2A4A]/5`}>
                  <option value="">Select</option>
                  {courseOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={label}>Intake Term</label>
                <input name="intake_term" value={form.intake_term} onChange={handleChange} required placeholder="e.g. Fall 2026" className={input} />
              </div>

              <div>
                <label className={label}>Mode of Study</label>
                <select name="mode_of_study" value={form.mode_of_study} onChange={handleChange} required className={input}>
                  <option value="">Select</option>
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className={label}>Preferred Campus</label>
                <select name="preferred_campus" value={form.preferred_campus} onChange={handleChange} required className={input}>
                  <option value="">Select</option>
                  <option value="Indore">Indore</option>
                  <option value="Dubai">Dubai</option>
                </select>
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

export default function ProgramOfStudy() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F5F1]" />}>
      <ProgramOfStudyForm />
    </Suspense>
  );
}