import { Card } from '../ui/Card';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  subtitleColor?: 'gray' | 'red' | 'green';
  icon?: React.ReactNode;
}

export function StatCard({ title, value, subtitle, subtitleColor = 'gray', icon }: StatCardProps) {
  const subtitleColors = {
    gray: 'text-gray-500',
    red: 'text-red-600',
    green: 'text-green-600',
  };

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && (
            <p className={`text-sm mt-1 ${subtitleColors[subtitleColor]}`}>{subtitle}</p>
          )}
        </div>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
    </Card>
  );
}
