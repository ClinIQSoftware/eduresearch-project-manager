import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

export default function BillingSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Plan Upgraded!</h1>
        <p className="text-gray-600 mb-6">Your account has been upgraded successfully.</p>
        <Link to="/dashboard" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
