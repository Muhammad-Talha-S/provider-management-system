import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { mockServiceOffers, mockServiceRequests, mockSpecialists } from '../data/mockData';
import { StatusBadge } from '../components/StatusBadge';
import { Search, Plus } from 'lucide-react';

export const ServiceOffersPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOffers = mockServiceOffers.filter((offer) => {
    const request = mockServiceRequests.find((r) => r.id === offer.serviceRequestId);
    const specialist = mockSpecialists.find((s) => s.id === offer.specialistId);
    return (
      offer.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      specialist?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl text-gray-900">Service Offers</h1>
          <p className="text-gray-500 mt-1">
            Provider responses to service requests (Draft, Submitted, Accepted, or Rejected)
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus size={20} />
          Create New Offer
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="relative">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search offers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Offer ID</th>
                <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Service Request</th>
                <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Specialist</th>
                <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Daily Rate</th>
                <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Total Cost</th>
                <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Match</th>
                <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOffers.map((offer) => {
                const request = mockServiceRequests.find((r) => r.id === offer.serviceRequestId);
                const specialist = mockSpecialists.find((s) => s.id === offer.specialistId);
                return (
                  <tr key={offer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{offer.id}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{request?.title || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{offer.serviceRequestId}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{specialist?.name || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">€{offer.dailyRate}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">€{offer.totalCost.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <div className="text-xs">
                        <div className="text-gray-700">Must: {offer.mustHaveMatchPercentage}%</div>
                        <div className="text-gray-500">Nice: {offer.niceToHaveMatchPercentage}%</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={offer.status} />
                    </td>
                    <td className="px-6 py-4">
                      <Link to={`/service-offers/${offer.id}`} className="text-sm text-blue-600 hover:text-blue-700">
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ServiceOffersPage;