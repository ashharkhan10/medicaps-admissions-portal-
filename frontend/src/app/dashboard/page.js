'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock, FileText, CheckCircle2, GraduationCap, XCircle, Eye,
  IdCard, Award, Image as ImageIcon, Plus, Calendar, ArrowRight,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Database timestamps come back without a timezone marker, so treat them as UTC
function parseDate(value) {
  if (!value) return null;
  const hasZone = /T.*(Z|[+-]\d{2}(:?\d{2})?)$/.test(value);
  return new Date(hasZone ? value : `${value}Z`);
}

function formatDate(value) {
  const d = parseDate(value);
  if (!d) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function timeAgo(value) {
  const d = parseDate(value);
  if (!d) return '—';
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

// Works out how far along an application is and which step comes next
function getProgress(app, hasProfile, hasEmployment, hasAcademic) {
  const isPostgrad = app.program_level === 'postgraduate';
  const isSubmitted = app.status === 'submitted';

  const stepList = [
    { label: 'Personal Information', done: hasProfile, href: '/apply/personal-info' },
    { label: 'Program of Study', done: !!app.course, href: '/apply/program-of-study?app=' + app.id },
  ];
  if (isPostgrad) {
    stepList.push({ label: 'Employment History', done: hasEmployment, href: '/apply/employment-history?app=' + app.id });
  }
  stepList.push({ label: 'Academic History', done: hasAcademic, href: '/apply/academic-history?app=' + app.id });
  stepList.push({ label: 'Documents & Submit', done: isSubmitted, href: '/apply/documents?app=' + app.id });

  const doneCount = stepList.filter((s) => s.done).length;
  return {
    // A submitted application is always complete, whatever the saved steps look like
    percent: isSubmitted ? 100 : Math.round((doneCount / stepList.length) * 100),
    next: stepList.find((s) => !s.done) || null,
  };
}

// Badge and message for a submitted application, based on the HubSpot decision
function getStatusView(app) {
  if (app.decision === 'accepted') {
    return {
      label: 'Accepted',
      badge: 'bg-green-100 text-green-800',
      Icon: CheckCircle2,
      box: 'bg-green-50 text-green-900',
      text: 'Congratulations! Your application has been accepted. Our admissions team will contact you shortly with the next steps.',
    };
  }
  if (app.decision === 'rejected') {
    return {
      label: 'Not Accepted',
      badge: 'bg-red-50 text-red-700',
      Icon: XCircle,
      box: 'bg-[#F7F5F1] text-[#2A2E35]/80',
      text: 'Thank you for applying. Unfortunately, we are unable to offer you a place in this program. You are welcome to apply to another program.',
    };
  }
  if (app.decision === 'under_review') {
    return {
      label: 'Under Review',
      badge: 'bg-[#1B2A4A]/10 text-[#1B2A4A]',
      Icon: Eye,
      box: 'bg-[#F7F5F1] text-[#2A2E35]/80',
      text: 'Our admissions team is currently reviewing your application. We will contact you as soon as a decision is made.',
    };
  }
  return {
    label: 'Submitted',
    badge: 'bg-[#C9A227]/20 text-[#8A6D10]',
    Icon: CheckCircle2,
    box: 'bg-[#F7F5F1] text-[#2A2E35]/80',
    text: 'Your application has been submitted successfully. Our admissions team will review it and get in touch with you regarding next steps.',
  };
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [hasProfile, setHasProfile] = useState(false);
  const [loadError, setLoadError] = useState('');
  const router = useRouter();

  useEffect(() => {
    async function loadDashboard() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          router.push('/signin');
          return null;
        }
        const userId = sessionData.session.user.id;

        const { data: profileRows } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', userId)
          .limit(1);
        const profileExists = !!(profileRows && profileRows.length > 0);
        setHasProfile(profileExists);

        const { data: apps, error } = await supabase
          .from('applications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          setLoadError('We could not load your applications. Please refresh the page.');
          setLoading(false);
          return null;
        }

        const ids = (apps || []).map((a) => a.id);
        let employmentIds = new Set();
        let academicIds = new Set();

        if (ids.length > 0) {
          const { data: emp } = await supabase
            .from('employment_history')
            .select('application_id')
            .in('application_id', ids);
          const { data: acad } = await supabase
            .from('academic_history')
            .select('application_id')
            .in('application_id', ids);
          employmentIds = new Set((emp || []).map((r) => r.application_id));
          academicIds = new Set((acad || []).map((r) => r.application_id));
        }

        setApplications(
          (apps || []).map((a) => ({
            ...a,
            ...getProgress(a, profileExists, employmentIds.has(a.id), academicIds.has(a.id)),
          }))
        );
        setLoading(false);
        return sessionData.session.access_token;
      } catch (err) {
        setLoadError('We could not load your applications. Please refresh the page.');
        setLoading(false);
        return null;
      }
    }

    // Reads Under Review / Accepted / Rejected from HubSpot in the background.
    // The dashboard never waits for it; it reloads only if something changed.
    async function syncDecisions(token) {
      try {
        const res = await fetch(`${API_URL}/api/application/hubspot-status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.updated > 0) await loadDashboard();
      } catch (err) {
        console.error('Decision sync failed:', err);
      }
    }

    async function start() {
      const token = await loadDashboard();
      if (token) syncDecisions(token);
    }
    start();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/signin');
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-[#2A2E35]/60">Loading...</div>;
  }

  const drafts = applications.filter((a) => a.status !== 'submitted');
  const submitted = applications.filter((a) => a.status === 'submitted');
  const canStartNew = drafts.length === 0;
  const startHref = hasProfile ? '/apply/program-of-study' : '/apply/personal-info';

  return (
    <div className="min-h-screen bg-[#F7F5F1]">
      <nav className="flex justify-between items-center px-8 py-4 bg-white border-b border-[#1B2A4A]/10">
        <a href="/signin"><img src="/logo.png" alt="Medicaps University" className="h-12 mix-blend-multiply" /></a>
        <button onClick={handleLogout} className="bg-[#1B2A4A] hover:bg-[#243758] transition text-white px-5 py-2.5 rounded-lg text-sm font-medium">Log Out</button>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {loadError && <p className="text-sm text-red-600 mb-6">{loadError}</p>}

        {/* No applications yet */}
        {applications.length === 0 && !loadError && (
          <>
            <div className="bg-[#1B2A4A] rounded-2xl p-10 md:p-12 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-[#C9A227]/10"></div>
              <div className="absolute -right-6 top-20 w-24 h-24 rounded-full bg-[#C9A227]/10"></div>

              <div className="relative z-10">
                <span className="inline-block text-[#C9A227] text-sm font-medium mb-3">Admissions 2026</span>
                <h1 className="font-display text-3xl md:text-4xl font-semibold text-white mb-3">Ready to apply to Medicaps University?</h1>
                <p className="text-white/70 max-w-lg mb-8">Complete your application in a few guided steps. You can save your progress and return anytime before submitting.</p>
                <a href={startHref} className="inline-block bg-[#C9A227] hover:bg-[#b8931f] transition text-[#1B2A4A] font-semibold px-7 py-3.5 rounded-xl">Start a New Application</a>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-white rounded-xl p-5 flex items-start gap-3 border border-[#1B2A4A]/10">
                <Clock size={20} className="text-[#C9A227] mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-[#1B2A4A] text-sm">Save anytime</p>
                  <p className="text-xs text-[#2A2E35]/60 mt-0.5">Your progress is saved as you go</p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 flex items-start gap-3 border border-[#1B2A4A]/10">
                <FileText size={20} className="text-[#C9A227] mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-[#1B2A4A] text-sm">Takes ~20 minutes</p>
                  <p className="text-xs text-[#2A2E35]/60 mt-0.5">Four short steps to complete</p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 border border-[#1B2A4A]/10">
                <p className="font-medium text-[#1B2A4A] text-sm mb-3">Have documents ready</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <IdCard size={16} className="text-[#C9A227] shrink-0" />
                    <span className="text-xs text-[#2A2E35]/70">Passport</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <GraduationCap size={16} className="text-[#C9A227] shrink-0" />
                    <span className="text-xs text-[#2A2E35]/70">Transcripts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award size={16} className="text-[#C9A227] shrink-0" />
                    <span className="text-xs text-[#2A2E35]/70">English Cert.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ImageIcon size={16} className="text-[#C9A227] shrink-0" />
                    <span className="text-xs text-[#2A2E35]/70">Photo</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* One or more applications */}
        {applications.length > 0 && (
          <>
            <div className="mb-8">
              <p className="text-sm font-medium text-[#C9A227] mb-1">Your Applications</p>
              <h1 className="font-display text-3xl font-semibold text-[#1B2A4A]">Application overview</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-xl p-5 border border-[#1B2A4A]/10">
                <p className="text-xs text-[#2A2E35]/50 mb-1">Total Applications</p>
                <p className="font-display text-3xl font-semibold text-[#1B2A4A]">{applications.length}</p>
              </div>
              <div className="bg-white rounded-xl p-5 border border-[#1B2A4A]/10">
                <p className="text-xs text-[#2A2E35]/50 mb-1">In Progress</p>
                <p className="font-display text-3xl font-semibold text-[#1B2A4A]">{drafts.length}</p>
              </div>
              <div className="bg-white rounded-xl p-5 border border-[#1B2A4A]/10">
                <p className="text-xs text-[#2A2E35]/50 mb-1">Submitted</p>
                <p className="font-display text-3xl font-semibold text-[#1B2A4A]">{submitted.length}</p>
              </div>
            </div>

            <div className="space-y-5">
              {applications.map((app) => {
                const isSubmitted = app.status === 'submitted';
                const view = isSubmitted ? getStatusView(app) : null;
                const badgeClass = isSubmitted ? view.badge : 'bg-[#1B2A4A]/5 text-[#1B2A4A]';
                const BadgeIcon = isSubmitted ? view.Icon : Clock;
                return (
                  <div key={app.id} className="bg-white rounded-2xl border border-[#1B2A4A]/10 p-6 md:p-8">
                    <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-[#1B2A4A] flex items-center justify-center shrink-0">
                          <GraduationCap size={20} className="text-[#C9A227]" />
                        </div>
                        <h2 className="font-display text-xl md:text-2xl font-semibold text-[#1B2A4A]">{app.course || 'Application'}</h2>
                      </div>

                      <span className={'flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full ' + badgeClass}>
                        <BadgeIcon size={14} />
                        Application Status: {isSubmitted ? view.label : 'In Progress'}
                      </span>
                    </div>

                    <p className="text-sm text-[#2A2E35]/60 mb-4">
                      Application ID:{' '}
                      <span className="font-medium text-[#2A2E35]">MED-2026-{String(app.application_number).padStart(6, '0')}</span>
                    </p>

                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-[#2A2E35]/60 mb-6">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={13} /> Started {formatDate(app.created_at)}
                      </span>
                      {!isSubmitted && (
                        <span className="flex items-center gap-1.5">
                          <Clock size={13} /> Last saved: {timeAgo(app.updated_at)}
                        </span>
                      )}
                      <span className="capitalize">{app.program_level} · {app.preferred_campus} · {app.intake_term}</span>
                    </div>

                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-[#2A2E35]/70">Application Progress</span>
                      <span className="font-medium text-[#1B2A4A]">{app.percent}%</span>
                    </div>
                    <div className="h-2 bg-[#1B2A4A]/10 rounded-full overflow-hidden mb-6">
                      <div className="h-full bg-[#C9A227] rounded-full transition-all" style={{ width: app.percent + '%' }} />
                    </div>

                    {isSubmitted ? (
                      <div className={'rounded-xl p-5 text-sm flex items-center justify-between flex-wrap gap-4 ' + view.box}>
                      <p className="flex-1 min-w-[240px]">{view.text}</p>
                      <a href={'/apply/review?app=' + app.id} className="flex items-center gap-2 bg-[#1B2A4A] hover:bg-[#243758] transition text-white px-5 py-2.5 rounded-xl text-sm font-medium">View Application <ArrowRight size={15} /></a>
                      </div>
                    ) : (
                      <div className="bg-[#F7F5F1] rounded-xl p-5 flex items-center justify-between flex-wrap gap-4">
                        <div>
                          <p className="font-medium text-[#1B2A4A] text-sm mb-1">Next step: {app.next ? app.next.label : 'Documents & Submit'}</p>
                          <p className="text-xs text-[#2A2E35]/60">Your information is saved automatically. You can continue from the last saved section.</p>
                        </div>
                        <a href={app.next ? app.next.href : '/apply/documents?app=' + app.id} className="flex items-center gap-2 bg-[#1B2A4A] hover:bg-[#243758] transition text-white px-6 py-3 rounded-xl text-sm font-medium">Continue Application <ArrowRight size={15} /></a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Start another application, only when nothing is left unfinished */}
            {canStartNew ? (
              <div className="bg-white rounded-2xl border border-[#1B2A4A]/10 p-6 md:p-8 mt-8 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full border border-[#C9A227] bg-[#C9A227]/10 flex items-center justify-center shrink-0">
                    <Plus size={20} className="text-[#C9A227]" />
                  </div>
                  <div>
                    <p className="font-display text-lg font-semibold text-[#1B2A4A]">Ready to apply to another program?</p>
                    <p className="text-sm text-[#2A2E35]/60">You can submit applications to multiple programs.</p>
                  </div>
                </div>
                <a href={startHref} className="flex items-center gap-2 bg-[#C9A227] hover:bg-[#b8931f] transition text-[#1B2A4A] font-semibold px-6 py-3 rounded-xl text-sm">Start New Application <ArrowRight size={15} /></a>
              </div>
            ) : (
              <p className="text-sm text-[#2A2E35]/50 text-center mt-8">Want to apply to another program? Finish and submit your current application first.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}