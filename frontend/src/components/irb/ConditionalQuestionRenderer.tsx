import type { IrbQuestion, QuestionType } from '../../types';

interface ConditionalQuestionRendererProps {
  questions: IrbQuestion[];
  answers: Record<number, string>;
  onAnswerChange: (questionId: number, value: string) => void;
}

function evaluateCondition(
  operator: string,
  currentValue: string | undefined,
  expectedValue: string,
): boolean {
  const val = currentValue ?? '';
  switch (operator) {
    case 'equals':
      return val === expectedValue;
    case 'not_equals':
      return val !== expectedValue;
    case 'contains':
      return val.includes(expectedValue);
    case 'is_empty':
      return val.trim() === '';
    case 'is_not_empty':
      return val.trim() !== '';
    default:
      return true;
  }
}

function isQuestionVisible(
  question: IrbQuestion,
  answers: Record<number, string>,
): boolean {
  if (!question.conditions || question.conditions.length === 0) return true;
  return question.conditions.every((cond) =>
    evaluateCondition(cond.operator, answers[cond.depends_on_question_id], cond.value),
  );
}

function QuestionField({
  question,
  value,
  onChange,
}: {
  question: IrbQuestion;
  value: string;
  onChange: (val: string) => void;
}) {
  const baseClass =
    'w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500';
  const type: QuestionType = question.question_type;

  if (type === 'textarea') {
    return <textarea value={value} onChange={(e) => onChange(e.target.value)} className={baseClass} rows={3} />;
  }

  if (type === 'select' || type === 'radio') {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} className={baseClass}>
        <option value="">Select...</option>
        {Array.isArray(question.options) &&
          question.options.map((opt, idx) => (
            <option key={idx} value={String(opt)}>
              {String(opt)}
            </option>
          ))}
      </select>
    );
  }

  if (type === 'checkbox') {
    const currentVals = value.split(',').filter(Boolean);
    return (
      <div className="space-y-1">
        {Array.isArray(question.options) &&
          question.options.map((opt, idx) => {
            const optStr = String(opt);
            return (
              <label key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={currentVals.includes(optStr)}
                  onChange={(e) => {
                    const newVals = e.target.checked
                      ? [...currentVals, optStr]
                      : currentVals.filter((v) => v !== optStr);
                    onChange(newVals.join(','));
                  }}
                  className="rounded border-gray-300"
                />
                {optStr}
              </label>
            );
          })}
      </div>
    );
  }

  if (type === 'date') {
    return <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className={baseClass} />;
  }

  if (type === 'number') {
    return <input type="number" value={value} onChange={(e) => onChange(e.target.value)} className={baseClass} />;
  }

  // Default: text input (also covers 'file_upload' as basic text for now)
  return <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={baseClass} />;
}

export default function ConditionalQuestionRenderer({
  questions,
  answers,
  onAnswerChange,
}: ConditionalQuestionRendererProps) {
  const activeQuestions = questions.filter((q) => q.is_active);
  const sorted = [...activeQuestions].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      {sorted.map((q) => {
        if (!isQuestionVisible(q, answers)) return null;
        return (
          <div key={q.id}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {q.text}
              {q.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {q.description && <p className="text-xs text-gray-400 mb-1">{q.description}</p>}
            <QuestionField question={q} value={answers[q.id] || ''} onChange={(val) => onAnswerChange(q.id, val)} />
          </div>
        );
      })}
      {sorted.filter((q) => isQuestionVisible(q, answers)).length === 0 && (
        <p className="text-sm text-gray-400">No questions configured for this board yet. You can skip this step.</p>
      )}
    </div>
  );
}
