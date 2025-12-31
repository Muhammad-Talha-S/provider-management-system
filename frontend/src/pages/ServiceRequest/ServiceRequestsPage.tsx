// src/pages/ServiceRequestsPage.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { mockServiceRequests, mockContracts } from '../../data/mockData';
import { StatusBadge } from '../../components/StatusBadge/StatusBadge';
import {
  FileText,
  Search,
  Filter,
  Calendar,
  Users,
  MapPin,
} from 'lucide-react';

export const ServiceRequestsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredRequests = mockServiceRequests.filter((request) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      request.title.toLowerCase().includes(term) ||
      request.id.toLowerCase().includes(term) ||
      request.role.toLowerCase().includes(term);

    const matchesStatus =
      statusFilter === 'all' || request.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl text-gray-900">Service Requests</h1>
        <p className="mt-1 text-gray-500">
          Service requests published by Service Management (Group 3) for
          provider bidding
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search
              size={20}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Request ID
                </th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Title
                </th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Role
                </th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Type
                </th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Duration
                </th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Location
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
              {filteredRequests.map((request) => {
                const contract = mockContracts.find(
                  (c) => c.id === request.linkedContractId,
                );

                return (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {request.id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {request.title}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Contract: {contract?.title ?? 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {request.role}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700">
                        {request.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} className="text-gray-400" />
                        {request.totalManDays} days
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-700">
                        <MapPin size={14} className="text-gray-400" />
                        {request.performanceLocation}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={request.status} />
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/service-requests/${request.id}`}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredRequests.length === 0 && (
          <div className="p-8 text-center text-sm text-gray-500">
            No service requests found matching your criteria
          </div>
        )}
      </div>
    </div>
  );
};
