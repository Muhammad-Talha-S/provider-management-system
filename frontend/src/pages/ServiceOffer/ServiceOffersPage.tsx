// src/pages/ServiceOffersPage.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  mockServiceOffers,
  mockServiceRequests,
  mockSpecialists,
} from '../..//data/mockData';
import { StatusBadge } from '../../components/StatusBadge/StatusBadge';
import { Search, Plus } from 'lucide-react';

export const ServiceOffersPage = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredOffers = mockServiceOffers.filter((offer) => {
    const term = searchTerm.toLowerCase();
    const request = mockServiceRequests.find(
      (r) => r.id === offer.serviceRequestId,
    );
    const specialist = mockSpecialists.find(
      (s) => s.id === offer.specialistId,
    );

    return (
      offer.id.toLowerCase().includes(term) ||
      request?.title.toLowerCase().includes(term) ||
      specialist?.name.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-gray-900">Service Offers</h1>
          <p className="mt-1 text-gray-500">
            Provider responses to service requests (Draft, Submitted, Accepted,
            or Rejected)
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus size={20} />
          Create New Offer
        </button>
      </div>

      {/* Search */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <div className="relative">
          <Search
            size={20}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search offers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Offers table */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Offer ID
                </th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Service Request
                </th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Specialist
                </th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Daily Rate
                </th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Total Cost
                </th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Match
                </th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOffers.map((offer) => {
                const request = mockServiceRequests.find(
                  (r) => r.id === offer.serviceRequestId,
                );
                const specialist = mockSpecialists.find(
                  (s) => s.id === offer.specialistId,
                );

                return (
                  <tr key={offer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {offer.id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {request?.title ?? 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {offer.serviceRequestId}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {specialist?.name ?? 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      €{offer.dailyRate}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      €{offer.totalCost.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs">
                        <div className="text-gray-700">
                          Must: {offer.mustHaveMatchPercentage}%
                        </div>
                        <div className="text-gray-500">
                          Nice: {offer.niceToHaveMatchPercentage}%
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={offer.status} />
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/service-offers/${offer.id}`}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredOffers.length === 0 && (
          <div className="p-8 text-center text-sm text-gray-500">
            No service offers found matching your criteria
          </div>
        )}
      </div>
    </div>
  );
};
