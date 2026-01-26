import { Link } from 'react-router-dom';
import { XCircle } from 'lucide-react';

export default function BillingCancel() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <XCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Upgrade Cancelled</h1>
        <p className="text-gray-600 mb-6">No worries! You can upgrade anytime from your settings.</p>
        <Link to="/settings/billing" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
          Back to Billing
        </Link>
      </div>
    </div>
  );
}
