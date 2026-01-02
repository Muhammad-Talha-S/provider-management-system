import React from 'react';
import { Link } from 'react-router-dom';
import { mockServiceOrders, mockSpecialists } from '../data/mockData';
import { StatusBadge } from '../components/StatusBadge';
import { Package, Calendar, MapPin } from 'lucide-react';

export const ServiceOrdersPage: React.FC = () => {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl text-gray-900">Service Orders</h1>
        <p className="text-gray-500 mt-1">
          Accepted service offers currently in execution or acceptance phase
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Specialist</th>
                <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Location</th>
                <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Man-Days</th>
                <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {mockServiceOrders.map((order) => {
                const specialist = mockSpecialists.find((s) => s.id === order.specialistId);
                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{order.id}</div>
                      <div className="text-xs text-gray-500">{order.serviceRequestId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">
                          {specialist?.name.charAt(0) || 'N'}
                        </div>
                        <div className="text-sm text-gray-900">{specialist?.name || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{order.role}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700">{order.duration}</div>
                      <div className="text-xs text-gray-500">{order.startDate} - {order.endDate}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-700">
                        <MapPin size={14} className="text-gray-400" />
                        {order.location}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{order.manDays}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-6 py-4">
                      <Link to={`/service-orders/${order.id}`} className="text-sm text-blue-600 hover:text-blue-700">
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

export default ServiceOrdersPage;