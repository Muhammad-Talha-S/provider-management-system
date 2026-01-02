import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { mockServiceOrders } from '../data/mockData';
import { StatusBadge } from '../components/StatusBadge';
import { Package, Calendar, MapPin } from 'lucide-react';

export const MyOrders: React.FC = () => {
  const { currentUser } = useApp();
  
  // Only show orders assigned to the current specialist
  const myOrders = mockServiceOrders.filter(
    (order) => order.assignedSpecialistId === currentUser.id
  );

  const activeOrders = myOrders.filter((o) => o.status === 'Active');
  const completedOrders = myOrders.filter((o) => o.status === 'Completed');

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl text-gray-900">My Service Orders</h1>
        <p className="text-gray-500 mt-1">View your assigned service orders and their status</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Orders</p>
              <p className="text-3xl text-gray-900 mt-2">{myOrders.length}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Orders</p>
              <p className="text-3xl text-gray-900 mt-2">{activeOrders.length}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
              <Package size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-3xl text-gray-900 mt-2">{completedOrders.length}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center">
              <Package size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Active Orders */}
      {activeOrders.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg text-gray-900 mb-4">Active Orders</h2>
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
            {activeOrders.map((order) => (
              <Link
                key={order.id}
                to={`/my-orders/${order.id}`}
                className="block p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm text-gray-900">{order.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">{order.id}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400" />
                    <div>
                      <p className="text-gray-500">Duration</p>
                      <p className="text-gray-900">{order.startDate} - {order.endDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-gray-400" />
                    <div>
                      <p className="text-gray-500">Location</p>
                      <p className="text-gray-900">{order.location}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-500">Role</p>
                    <p className="text-gray-900">{order.role}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Completed Orders */}
      {completedOrders.length > 0 && (
        <div>
          <h2 className="text-lg text-gray-900 mb-4">Completed Orders</h2>
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
            {completedOrders.map((order) => (
              <Link
                key={order.id}
                to={`/my-orders/${order.id}`}
                className="block p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm text-gray-900">{order.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">{order.id}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400" />
                    <div>
                      <p className="text-gray-500">Duration</p>
                      <p className="text-gray-900">{order.startDate} - {order.endDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-gray-400" />
                    <div>
                      <p className="text-gray-500">Location</p>
                      <p className="text-gray-900">{order.location}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-500">Role</p>
                    <p className="text-gray-900">{order.role}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {myOrders.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Package size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg text-gray-900 mb-2">No Service Orders</h3>
          <p className="text-gray-500">You don't have any assigned service orders yet.</p>
        </div>
      )}
    </div>
  );
};

export default MyOrders;