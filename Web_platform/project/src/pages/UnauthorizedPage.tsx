import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center bg-gray-50">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-error-100">
        <ShieldAlert className="h-8 w-8 text-error-600" />
      </div>
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">Access Restricted</h1>
        <p className="mt-2 text-gray-600 max-w-sm">
          You do not have permission to view this page. If you believe this is
          an error, please contact support.
        </p>
      </div>
      <Link
        to="/"
        className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary-600 px-6 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Link>
    </div>
  );
}
