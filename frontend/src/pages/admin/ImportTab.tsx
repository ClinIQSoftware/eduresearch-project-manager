import { useState } from 'react';
import { useBulkUploadUsers } from '../../hooks/useAdmin';
import { downloadUserTemplate } from '../../api/admin';
import { getErrorMessage } from '../../utils/errorHandling';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import type { BulkUploadResult } from '../../types';

// Static color mapping for Tailwind to include these classes at build time
const statusColors = {
  green: {
    bg: 'bg-green-50',
    text: 'text-green-600',
    label: 'text-green-700',
  },
  yellow: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-600',
    label: 'text-yellow-700',
  },
  red: {
    bg: 'bg-red-50',
    text: 'text-red-600',
    label: 'text-red-700',
  },
} as const;

export default function ImportTab() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<BulkUploadResult | null>(null);
  const [error, setError] = useState('');
  const bulkUpload = useBulkUploadUsers();

  const handleDownload = async () => {
    try {
      const response = await downloadUserTemplate();
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'user_import_template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch { setError('Failed to download template'); }
  };

  const handleUpload = async () => {
    if (!file) return;
    setError('');
    setResult(null);
    try {
      const response = await bulkUpload.mutateAsync(file);
      setResult(response);
      setFile(null);
    } catch (error) {
      setError(getErrorMessage(error));
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Card className="bg-blue-50 border-blue-200">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">Bulk User Import</h2>
        <p className="text-blue-700 text-sm">Upload an Excel file (.xlsx) to create multiple users. Users receive temporary passwords via email.</p>
      </Card>

      <Card title="Step 1: Download Template">
        <p className="text-sm text-gray-600 mb-4">Required: email, first_name, last_name. Optional: phone, bio, institution, department, is_superuser.</p>
        <Button variant="secondary" onClick={handleDownload}>Download Template</Button>
      </Card>

      <Card title="Step 2: Upload Filled File">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <input type="file" accept=".xlsx,.xls" onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" id="file-upload" />
          <label htmlFor="file-upload" className="cursor-pointer">
            {file ? <div className="text-green-600"><p className="font-medium">{file.name}</p><p className="text-sm">Click to change</p></div> : <div className="text-gray-500"><p className="font-medium">Click to select Excel file</p><p className="text-sm">.xlsx or .xls only</p></div>}
          </label>
        </div>
        {file && <div className="mt-4 flex justify-end"><Button onClick={handleUpload} loading={bulkUpload.isPending}>Upload & Create Users</Button></div>}
      </Card>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>}

      {result && (
        <Card title="Import Results">
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { label: 'Created', value: result.created, color: 'green' as const },
              { label: 'Skipped', value: result.skipped, color: 'yellow' as const },
              { label: 'Errors', value: result.errors.length, color: 'red' as const }
            ].map(s => (
              <div key={s.label} className={`text-center p-4 ${statusColors[s.color].bg} rounded-lg`}>
                <p className={`text-2xl font-bold ${statusColors[s.color].text}`}>{s.value}</p>
                <p className={`text-sm ${statusColors[s.color].label}`}>{s.label}</p>
              </div>
            ))}
          </div>
          {result.errors.length > 0 && (
            <div>
              <h4 className="font-medium text-red-600 mb-2">Errors:</h4>
              <ul className="text-sm text-red-600 list-disc list-inside space-y-1">
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
