interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  className?: string;
}

export function Checkbox({ label, checked, onChange, className = '' }: CheckboxProps) {
  return (
    <label className={`flex items-center gap-3 ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4"
      />
      <span>{label}</span>
    </label>
  );
}
