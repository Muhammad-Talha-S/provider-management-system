// src/pages/ServiceOrdersPage.tsx
import { Link } from 'react-router-dom';
import { mockServiceOrders, mockSpecialists } from '../../data/mockData';
import { StatusBadge } from '../../components/StatusBadge/StatusBadge';
import { Package, Calendar, MapPin } from 'lucide-react';

export const ServiceOrdersPage = () => {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl text-gray-900">Service Orders</h1>
        <p className="mt-1 text-gray-500">
          Accepted service offers currently in execution or acceptance phase
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Order ID
                </th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Specialist
                </th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Role
                </th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Duration
                </th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Location
                </th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Man-Days
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
              {mockServiceOrders.map((order) => {
                const specialist = mockSpecialists.find(
                  (s) => s.id === order.specialistId,
                );

                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{order.id}</div>
                      <div className="text-xs text-gray-500">
                        {order.serviceRequestId}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm text-blue-600">
                          {specialist?.name.charAt(0) ?? 'N'}
                        </div>
                        <div className="text-sm text-gray-900">
                          {specialist?.name ?? 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {order.role}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700">
                        {order.duration}
                      </div>
                      <div className="text-xs text-gray-500">
                        {order.startDate} - {order.endDate}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-700">
                        <MapPin size={14} className="text-gray-400" />
                        {order.location}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {order.manDays}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/service-orders/${order.id}`}
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
      </div>
    </div>
  );
};
