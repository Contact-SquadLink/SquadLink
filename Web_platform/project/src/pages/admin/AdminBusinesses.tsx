import { Link } from 'react-router-dom';
import { Store, ChevronRight, MapPin, Phone, Mail } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/States';
import { demoBusinesses } from '@/utils/demo-data';

export function AdminBusinessesPage() {
  const businesses = demoBusinesses;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-1">Businesses</h1>
      <p className="text-sm text-gray-500 mb-6">Review business registrations and verification status.</p>

      {businesses.length === 0 ? (
        <EmptyState
          icon={<Store className="h-7 w-7" />}
          title="No businesses registered"
          description="Registered businesses will appear here for verification."
        />
      ) : (
        <div className="space-y-3">
          {businesses.map((business) => (
            <Link
              key={business.id}
              to={`/admin/businesses/${business.id}`}
              className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-primary-200 transition-all"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50">
                <Store className="h-6 w-6 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{business.name}</p>
                <p className="text-xs text-gray-500 truncate">
                  {business.email || business.phone || business.address || 'No contact info'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={business.isVerified ? 'success' : 'warning'}>
                  {business.isVerified ? 'Verified' : 'Pending'}
                </Badge>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminBusinessDetailPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-1">Business Details</h1>
      <p className="text-sm text-gray-500 mb-6">Review and verify this business.</p>

      <div className="space-y-4">
        {demoBusinesses.slice(0, 3).map((business) => (
          <div key={business.id} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50">
                  <Store className="h-6 w-6 text-gray-400" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-gray-900">{business.name}</h2>
                  <Badge variant={business.isVerified ? 'success' : 'warning'}>
                    {business.isVerified ? 'Verified' : 'Pending'}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {business.address && (
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="h-4 w-4 text-gray-400" /> {business.address}
                </div>
              )}
              {business.phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="h-4 w-4 text-gray-400" /> {business.phone}
                </div>
              )}
              {business.email && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="h-4 w-4 text-gray-400" /> {business.email}
                </div>
              )}
            </div>
            {!business.isVerified && (
              <div className="mt-4 flex gap-2">
                <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-success-600 px-4 text-sm font-semibold text-white hover:bg-success-700 transition-colors">
                  Verify Business
                </button>
                <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-error-200 px-4 text-sm font-semibold text-error-600 hover:bg-error-50 transition-colors">
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
