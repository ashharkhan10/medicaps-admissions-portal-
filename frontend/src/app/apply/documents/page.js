'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Upload, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { syncStage } from '../../../lib/hubspotSync';
import StepSidebar from '../../../components/StepSidebar';
import FormNav from '../../../components/FormNav';

const docTypes = [
  { key: 'passport', label: 'Passport Copy' },
  { key: 'transcript', label: 'Academic Transcripts' },
  { key: 'english_cert', label: 'English Proficiency Certificate' },
  { key: 'photo', label: 'Passport-size Photo' },
];

// Must match the storage bucket settings in Supabase
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ACCEPT = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';

const uploadBox = "flex items-center justify-between border border-dashed border-[#1B2A4A]/25 rounded-xl p-4 cursor-pointer hover:border-[#C9A227] hover:bg-[#C9A227]/5 transition";

// Stored paths look like userId/appId/passport-1712345678-myfile.pdf -> "myfile.pdf"
function fileNameFromPath(path) {
  return String(path || '').split('/').pop().replace(/^[a-z_]+-\d+-/, '');
}

// Keeps only safe characters in file names (letters, numbers, dot, dash, underscore)
function safeFileName(name) {
  const cleaned = String(name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_');
  return cleaned.slice(-100);
}

function DocumentsForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appId = searchParams.get('app');
  const [userId, setUserId] = useState(null);
  const [files, setFiles] = useState({});
  const [existing, setExisting] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [needsEnglishCert, setNeedsEnglishCert] = useState(true);
  const pendingSent = useRef(false);

  useEffect(() => {
    async function loadData() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push('/signin');
        return;
      }
      setUserId(sessionData.session.user.id);

      if (!appId) {
        router.push('/dashboard');
        return;
      }

      // An already submitted application cannot be changed
      const { data: appData } = await supabase
        .from('applications')
        .select('status')
        .eq('id', appId)
        .single();

      if (appData?.status === 'submitted') {
        router.push('/dashboard');
        return;
      }

      const { data: academicData } = await supabase
        .from('academic_history')
        .select('english_test_type')
        .eq('application_id', appId)
        .limit(1);

      setNeedsEnglishCert(!!(academicData && academicData[0]?.english_test_type));

      // Documents uploaded earlier are shown, so the student does not upload them again
      const { data: docs } = await supabase
        .from('documents')
        .select('document_type, file_url')
        .eq('application_id', appId);

      const map = {};
      (docs || []).forEach((d) => {
        map[d.document_type] = fileNameFromPath(d.file_url);
      });
      setExisting(map);
    }
    loadData();
  }, [router, appId]);

  function handleFileChange(key, label, file) {
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setMessage(`${label}: only PDF, JPG or PNG files are allowed.`);
      return;
    }
    if (file.size > MAX_SIZE) {
      setMessage(`${label}: file is too large (maximum 5 MB).`);
      return;
    }

    setMessage('');
    setFiles({ ...files, [key]: file });

    // HubSpot: first file selected -> Documents Pending (sent once per visit)
    if (!pendingSent.current) {
      pendingSent.current = true;
      syncStage(appId, 'Documents Pending');
    }
  }

  const requiredDocs = docTypes.filter((doc) => doc.key !== 'english_cert' || needsEnglishCert);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage('');

    const missingDocs = requiredDocs.filter((doc) => !files[doc.key] && !existing[doc.key]);
    if (missingDocs.length > 0) {
      setMessage(`Please upload: ${missingDocs.map((d) => d.label).join(', ')}`);
      return;
    }

    setLoading(true);

    try {
      // Upload only newly selected files; each one replaces the earlier file of that type
      for (const doc of requiredDocs) {
        const file = files[doc.key];
        if (!file) continue;

        const filePath = `${userId}/${appId}/${doc.key}-${Date.now()}-${safeFileName(file.name)}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file, { contentType: file.type });

        if (uploadError) throw uploadError;

        await supabase.from('documents').delete().eq('application_id', appId).eq('document_type', doc.key);

        const { error: insertError } = await supabase
          .from('documents')
          .insert([{ application_id: appId, document_type: doc.key, file_url: filePath }]);

        if (insertError) throw insertError;
      }

      router.push(`/apply/review?app=${appId}`);
    } catch (err) {
      setMessage(err.message || 'Upload failed. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F5F1]">
      <FormNav />

      <div className="flex flex-col md:flex-row">
        <StepSidebar current="documents" />

        <div className="flex-1 px-6 py-10 md:px-16 md:py-14">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-[#C9A227] mb-2">Step 4 of 4</p>
            <h1 className="font-display text-3xl font-semibold text-[#1B2A4A] mb-2">Documents</h1>
            <p className="text-sm text-[#2A2E35]/70 mb-8">Upload the required documents as PDF, JPG or PNG (max 5 MB each). You will review everything before submitting.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {requiredDocs.map((doc) => {
                const newFile = files[doc.key];
                const savedName = existing[doc.key];
                return (
                  <label key={doc.key} className={uploadBox}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#1B2A4A]/5 flex items-center justify-center">
                        {savedName && !newFile ? <CheckCircle2 size={16} className="text-green-700" /> : <Upload size={16} className="text-[#1B2A4A]" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#2A2E35]">{doc.label}</p>
                        {newFile && <p className="text-xs text-[#2A2E35]/50">{newFile.name}</p>}
                        {!newFile && savedName && <p className="text-xs text-green-700">Uploaded: {savedName} (click to replace)</p>}
                        {!newFile && !savedName && <p className="text-xs text-[#2A2E35]/50">Click to upload</p>}
                      </div>
                    </div>
                    <input type="file" accept={ACCEPT} className="hidden" onChange={(e) => { handleFileChange(doc.key, doc.label, e.target.files[0]); e.target.value = ''; }} />
                  </label>
                );
              })}

              <button type="submit" disabled={loading} className="w-full bg-[#1B2A4A] hover:bg-[#243758] transition text-white rounded-xl p-3.5 font-medium mt-6">
                {loading ? 'Uploading...' : 'Next: Review Application'}
              </button>

              {message && <p className="text-sm text-center mt-3 text-red-600">{message}</p>}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Documents() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F5F1]" />}>
      <DocumentsForm />
    </Suspense>
  );
}