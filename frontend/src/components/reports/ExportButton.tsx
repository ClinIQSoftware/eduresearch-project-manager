import { Button } from '../ui/Button';

interface ExportButtonProps<T extends object> {
  data: T[];
  filename: string;
  columns: { key: string; header: string }[];
}

export function ExportButton<T extends object>({ data, filename, columns }: ExportButtonProps<T>) {
  const handleExport = () => {
    if (data.length === 0) return;

    const headers = columns.map((c) => c.header).join(',');
    const rows = data.map((row) =>
      columns
        .map((c) => {
          const value = (row as Record<string, unknown>)[c.key];
          const str = value === null || value === undefined ? '' : String(value);
          // Escape quotes and wrap in quotes if contains comma
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    );

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="secondary" onClick={handleExport} disabled={data.length === 0}>
      Export CSV
    </Button>
  );
}
