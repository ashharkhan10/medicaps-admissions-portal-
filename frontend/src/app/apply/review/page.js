'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Download, Pencil, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { syncStage } from '../../../lib/hubspotSync';
import StepSidebar from '../../../components/StepSidebar';
import FormNav from '../../../components/FormNav';

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const docLabels = { passport: 'Passport Copy', transcript: 'Academic Transcripts', english_cert: 'English Proficiency Certificate', photo: 'Passport-size Photo' };
const scaleText = { out_of_100: 'Out of 100', out_of_10: 'Out of 10', out_of_4: 'Out of 4.0' };
const testText = { ielts: 'IELTS', toefl: 'TOEFL' };

// Hides the nav, sidebar, buttons, chatbot and cookie banner in the PDF, and keeps colours
const printCss = `@media print { .no-print, .fixed { display: none !important; } body { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } @page { margin: 14mm; } }`;

const actionBtn = "flex items-center gap-2 bg-[#1B2A4A] hover:bg-[#243758] transition text-white px-5 py-2.5 rounded-xl text-sm font-medium";
const outlineBtn = "flex items-center gap-2 border border-[#1B2A4A]/25 text-[#1B2A4A] hover:bg-[#1B2A4A]/5 transition px-5 py-2.5 rounded-xl text-sm font-medium";

function formatDay(value) {
  if (!value) return '';
  const [y, m, d] = String(value).slice(0, 10).split('-');
  if (!y || !m || !d) return String(value);
  return `${Number(d)} ${months[Number(m) - 1]} ${y}`;
}

function formatDateTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function cap(value) {
  if (!value) return '';
  const s = String(value);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function fileNameFromPath(path) {
  return String(path || '').split('/').pop().replace(/^[a-z_]+-\d+-/, '');
}

function formatAppNumber(n) {
  return `MED-2026-${String(n).padStart(6, '0')}`;
}

function Field({ label, value, wide }) {
  return (
    <div className={wide ? 'md:col-span-2 print:col-span-2' : ''}>
      <p className="text-xs text-[#2A2E35]/50 mb-0.5">{label}</p>
      <p className="text-sm text-[#2A2E35] font-medium break-words">{value || '—'}</p>
    </div>
  );
}

function Section({ title, editHref, children }) {
  return (
    <div className="bg-white rounded-2xl border border-[#1B2A4A]/10 p-6 break-inside-avoid">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-semibold text-[#1B2A4A]">{title}</h2>
        {editHref && <a href={editHref} className="no-print flex items-center gap-1.5 text-sm text-[#C9A227] font-medium hover:underline"><Pencil size={13} /> Edit</a>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-x-6 gap-y-4">{children}</div>
    </div>
  );
}

function ReviewForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appId = searchParams.get('app');
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);
  const [terms, setTerms] = useState(false);
  const [certify, setCertify] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

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
      const userId = sessionData.session.user.id;

      const { data: app } = await supabase
        .from('applications')
        .select('*')
        .eq('id', appId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!app) {
        router.push('/dashboard');
        return;
      }

      const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
      const { data: emp } = await supabase.from('employment_history').select('*').eq('application_id', appId).limit(1);
      const { data: acad } = await supabase.from('academic_history').select('*').eq('application_id', appId).limit(1);
      const { data: docs } = await supabase.from('documents').select('document_type, file_url').eq('application_id', appId);
      const { data: consent } = await supabase.from('application_consent').select('*').eq('application_id', appId).limit(1);

      const docMap = {};
      (docs || []).forEach((d) => {
        docMap[d.document_type] = fileNameFromPath(d.file_url);
      });

      setInfo({
        app,
        profile: profile || {},
        employment: emp?.[0] || null,
        academic: acad?.[0] || null,
        docMap,
        consent: consent?.[0] || null,
      });
      setLoading(false);
    }
    loadData();
  }, [router, appId]);

  function handleDownload() {
    const oldTitle = document.title;
    document.title = `Medicaps-Application-${formatAppNumber(info.app.application_number)}`;
    window.print();
    setTimeout(() => {
      document.title = oldTitle;
    }, 1000);
  }

  if (loading || !info) {
    return <div className="min-h-screen flex items-center justify-center text-[#2A2E35]/60">Loading...</div>;
  }

  const { app, profile, employment, academic, docMap, consent } = info;
  const isSubmitted = app.status === 'submitted';
  const isPostgrad = app.program_level === 'postgraduate';
  const edit = (path) => (isSubmitted ? null : `${path}?app=${app.id}`);

  const requiredTypes = ['passport', 'transcript', 'photo'];
  if (academic?.english_test_type) requiredTypes.splice(2, 0, 'english_cert');
  const missingTypes = requiredTypes.filter((t) => !docMap[t]);

  async function handleSubmit() {
    setMessage('');

    if (!academic) {
      setMessage('Please complete Academic History before submitting.');
      return;
    }
    if (missingTypes.length > 0) {
      setMessage(`Please upload: ${missingTypes.map((t) => docLabels[t]).join(', ')}`);
      return;
    }
    if (!terms || !certify) {
      setMessage('Please accept both Terms & Conditions and Certification.');
      return;
    }

    setSubmitting(true);

    const { error: consentError } = await supabase
      .from('application_consent')
      .insert([{ application_id: app.id, terms_accepted: terms, certified: certify, submitted_at: new Date().toISOString() }]);

    if (consentError) {
      setMessage(consentError.message);
      setSubmitting(false);
      return;
    }

    const { error: statusError } = await supabase.from('applications').update({ status: 'submitted' }).eq('id', app.id);

    if (statusError) {
      setMessage(statusError.message);
      setSubmitting(false);
      return;
    }

    // HubSpot: move the deal to Submitted (never blocks submission)
    await syncStage(app.id, 'Submitted');

    setMessage('Application submitted successfully!');
    setTimeout(() => router.push('/dashboard'), 1500);
  }

  const employmentEnd = employment?.currently_employed ? 'Present' : formatDay(employment?.end_date);
  const grade = academic ? `${academic.grade_value || ''} (${scaleText[academic.grade_scale] || academic.grade_scale || ''})` : '';
  const englishTest = academic?.english_test_type ? `${testText[academic.english_test_type] || academic.english_test_type} - Score ${academic.english_test_score || '—'}` : 'None';

  return (
    <div className="min-h-screen bg-[#F7F5F1]">
      <style>{printCss}</style>

      <FormNav />

      <div className="flex flex-col md:flex-row">
        {!isSubmitted && <StepSidebar current="review" />}

        <div className="flex-1 px-6 py-10 md:px-16 md:py-14 print:p-0">
          <div className="max-w-3xl mx-auto space-y-5">
            <div className="hidden print:flex items-center justify-between border-b border-[#1B2A4A]/20 pb-4 mb-2">
              <img src="/logo.png" alt="Medicaps University" className="h-14" />
              <p className="text-sm text-[#2A2E35]/70">Application Form</p>
            </div>

            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <p className="no-print text-sm font-medium text-[#C9A227] mb-2">{isSubmitted ? 'Submitted Application' : 'Step 4 of 4 · Review'}</p>
                <h1 className="font-display text-3xl font-semibold text-[#1B2A4A] mb-2">{isSubmitted ? 'Your Application' : 'Review Your Application'}</h1>
                <p className="text-sm text-[#2A2E35]/70">Application ID: <span className="font-medium text-[#2A2E35]">{formatAppNumber(app.application_number)}</span></p>
                {isSubmitted && consent?.submitted_at && <p className="text-sm text-[#2A2E35]/70 mt-1">Submitted on {formatDateTime(consent.submitted_at)}</p>}
              </div>

              <div className="no-print flex gap-2 flex-wrap">
                {isSubmitted && <a href="/dashboard" className={outlineBtn}><ArrowLeft size={15} /> Dashboard</a>}
                <button onClick={handleDownload} className={actionBtn}><Download size={15} /> Download PDF</button>
              </div>
            </div>

            {!isSubmitted && <p className="no-print text-sm text-[#2A2E35]/70">Please check every section carefully. Use Edit to make changes before you submit.</p>}

            <Section title="Personal Information" editHref={edit('/apply/personal-info')}>
              <Field label="Full Name" value={`${profile.first_name || ''} ${profile.last_name || ''}`.trim()} />
              <Field label="Date of Birth" value={formatDay(profile.date_of_birth)} />
              <Field label="Gender" value={cap(profile.gender)} />
              <Field label="Nationality" value={profile.nationality} />
              <Field label="Email" value={profile.email} />
              <Field label="Mobile Number" value={profile.mobile_number ? `${profile.country_code || ''} ${profile.mobile_number}`.trim() : ''} />
              <Field label="Address Country" value={profile.address_country} />
              <Field label="Address City" value={profile.address_city} />
              <Field label="Full Address" value={profile.full_address} wide />
              <Field label="Emergency Contact Name" value={profile.emergency_contact_name} />
              <Field label="Emergency Contact Phone" value={profile.emergency_contact_phone} />
            </Section>

            <Section title="Program of Study" editHref={edit('/apply/program-of-study')}>
              <Field label="Program Level" value={cap(app.program_level)} />
              <Field label="Course" value={app.course} />
              <Field label="Intake Term" value={app.intake_term} />
              <Field label="Mode of Study" value={cap(app.mode_of_study)} />
              <Field label="Preferred Campus" value={app.preferred_campus} />
            </Section>

            {isPostgrad && (
              <Section title="Employment History" editHref={edit('/apply/employment-history')}>
                <Field label="Employer Name" value={employment?.employer_name} />
                <Field label="Job Title" value={employment?.job_title} />
                <Field label="Currently Employed" value={employment ? (employment.currently_employed ? 'Yes' : 'No') : ''} />
                <Field label="Start Date" value={formatDay(employment?.start_date)} />
                <Field label="End Date" value={employmentEnd} />
              </Section>
            )}

            <Section title="Academic History" editHref={edit('/apply/academic-history')}>
              <Field label="Highest Qualification" value={academic?.highest_qualification} />
              <Field label="Institution Name" value={academic?.institution_name} />
              <Field label="Institution Country" value={academic?.institution_country} />
              <Field label="Year of Completion" value={academic?.year_of_completion ? String(academic.year_of_completion) : ''} />
              <Field label="Grade / GPA" value={grade} />
              <Field label="English Proficiency Test" value={englishTest} />
            </Section>

            <Section title="Documents" editHref={edit('/apply/documents')}>
              {requiredTypes.map((t) => (
                <Field key={t} label={docLabels[t]} value={docMap[t] || 'Not uploaded'} />
              ))}
            </Section>

            {isSubmitted ? (
              <Section title="Declaration">
                <Field label="Terms & Conditions" value={consent?.terms_accepted ? 'Accepted' : ''} />
                <Field label="Certification" value={consent?.certified ? 'Information certified as true and accurate' : ''} />
              </Section>
            ) : (
              <div className="no-print bg-white rounded-2xl border border-[#1B2A4A]/10 p-6 space-y-3">
                <h2 className="font-display text-lg font-semibold text-[#1B2A4A] mb-1">Declaration</h2>
                <label className="flex items-start gap-2.5">
                  <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#C9A227]" />
                  <span className="text-sm text-[#2A2E35]">I accept the Terms & Conditions.</span>
                </label>
                <label className="flex items-start gap-2.5">
                  <input type="checkbox" checked={certify} onChange={(e) => setCertify(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#C9A227]" />
                  <span className="text-sm text-[#2A2E35]">I certify that all information provided is true and accurate.</span>
                </label>

                <button onClick={handleSubmit} disabled={submitting} className="w-full bg-[#1B2A4A] hover:bg-[#243758] transition text-white rounded-xl p-3.5 font-medium mt-4 disabled:opacity-60">
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>

                {message && <p className={'text-sm text-center mt-3 ' + (message.includes('successfully') ? 'text-green-700' : 'text-red-600')}>{message}</p>}
              </div>
            )}

            {isSubmitted && (
              <div className="flex items-center gap-2 text-sm text-[#2A2E35]/60 pt-2">
                <CheckCircle2 size={15} className="text-[#C9A227]" />
                This is a copy of your submitted application to Medicaps University.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Review() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F5F1]" />}>
      <ReviewForm />
    </Suspense>
  );
}