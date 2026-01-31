import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import type { IrbSubmissionHistory, SubmissionStatus } from '../../types';

const STATUS_ORDER: SubmissionStatus[] = [
  'draft',
  'submitted',
  'in_triage',
  'assigned_to_main',
  'under_review',
  'decision_made',
  'accepted',
];

const STATUS_LABELS: Record<SubmissionStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  in_triage: 'In Triage',
  assigned_to_main: 'Assigned',
  under_review: 'Under Review',
  decision_made: 'Decision Made',
  accepted: 'Accepted',
  revision_requested: 'Revision Requested',
  declined: 'Declined',
};

interface SubmissionTimelineProps {
  currentStatus: SubmissionStatus;
  history: IrbSubmissionHistory[];
}

export default function SubmissionTimeline({ currentStatus, history }: SubmissionTimelineProps) {
  // For terminal states, build the timeline up to them
  const isTerminal = currentStatus === 'declined' || currentStatus === 'revision_requested';
  const steps = isTerminal
    ? [...STATUS_ORDER.slice(0, STATUS_ORDER.indexOf('decision_made') + 1), currentStatus]
    : STATUS_ORDER;

  const currentIdx = steps.indexOf(currentStatus);

  return (
    <div className="space-y-4">
      {/* Visual progress */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {steps.map((status, i) => {
          const isPast = i < currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <div key={status} className="flex items-center gap-1 shrink-0">
              {isPast ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : isCurrent ? (
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                  <Circle className="w-3 h-3 text-white fill-white" />
                </div>
              ) : (
                <Circle className="w-5 h-5 text-gray-300" />
              )}
              <span
                className={`text-xs whitespace-nowrap ${
                  isCurrent ? 'font-semibold text-blue-700' : isPast ? 'text-green-700' : 'text-gray-400'
                }`}
              >
                {STATUS_LABELS[status]}
              </span>
              {i < steps.length - 1 && <ArrowRight className="w-3 h-3 text-gray-300 mx-1" />}
            </div>
          );
        })}
      </div>

      {/* History log */}
      {history.length > 0 && (
        <div className="border-l-2 border-gray-200 ml-2 space-y-3">
          {[...history].reverse().map((entry) => (
            <div key={entry.id} className="relative pl-5">
              <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-gray-400" />
              <div className="text-sm">
                <span className="font-medium text-gray-700">
                  {STATUS_LABELS[entry.to_status] || entry.to_status}
                </span>
                {entry.from_status && (
                  <span className="text-gray-400">
                    {' '}
                    from {STATUS_LABELS[entry.from_status] || entry.from_status}
                  </span>
                )}
                <span className="text-gray-400 ml-2">
                  {new Date(entry.created_at).toLocaleDateString()}{' '}
                  {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {entry.note && <p className="text-xs text-gray-500 mt-0.5">{entry.note}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
