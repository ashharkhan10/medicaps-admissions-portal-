'use client';

import { Check } from 'lucide-react';

const steps = [
  { key: 'personal-info', label: 'Personal Information', percent: 25 },
  { key: 'program-of-study', label: 'Program of Study', percent: 50 },
  { key: 'academic-history', label: 'Academic History', percent: 75 },
  { key: 'documents', label: 'Documents & Submit', percent: 100 },
];

const wrapClass = "no-print w-full md:w-72 shrink-0 bg-[#1B2A4A] md:min-h-screen p-6 md:p-8";
const barTrack = "h-1.5 bg-white/10 rounded-full overflow-hidden";
const barFill = "h-full bg-[#C9A227] rounded-full transition-all duration-700";

// current: the page key, or 'review' when every step is done
export default function StepSidebar({ current }) {
  const currentIndex = current === 'review' ? steps.length : steps.findIndex((s) => s.key === current);
  const donePercent = currentIndex <= 0 ? 0 : steps[currentIndex - 1].percent;

  return (
    <div className={wrapClass}>
      <div className="mb-10">
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-xs uppercase tracking-wider text-white/50">Your Progress</span>
          <span className="font-display text-2xl font-semibold text-[#C9A227]">{donePercent}%</span>
        </div>
        <div className={barTrack}>
          <div className={barFill} style={{ width: donePercent + '%' }} />
        </div>
      </div>

      <div>
        {steps.map((step, i) => {
          const isDone = i < currentIndex;
          const isActive = i === currentIndex;
          const isLast = i === steps.length - 1;

          const circle = isDone ? 'bg-[#C9A227] text-[#1B2A4A]' : isActive ? 'border-2 border-[#C9A227] text-[#C9A227]' : 'border border-white/20 text-white/40';
          const line = isDone ? 'bg-[#C9A227]' : 'bg-white/15';
          const title = isActive ? 'text-white font-medium' : isDone ? 'text-white/80' : 'text-white/40';
          const sub = isDone ? 'text-[#C9A227]' : isActive ? 'text-white/60' : 'text-white/30';
          const subText = isDone ? `Completed · ${step.percent}%` : isActive ? `In progress · reaches ${step.percent}%` : `${step.percent}%`;

          return (
            <div key={step.key} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 transition ${circle}`}>
                  {isDone ? <Check size={15} /> : i + 1}
                </div>
                {!isLast && <div className={`w-0.5 flex-1 min-h-[48px] my-1.5 rounded-full transition-all duration-700 ${line}`} />}
              </div>
              <div className={isLast ? 'pt-1' : 'pt-1 pb-8'}>
                <p className={`text-sm ${title}`}>{step.label}</p>
                <p className={`text-xs mt-1 ${sub}`}>{subText}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}