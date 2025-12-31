// src/pages/MyOrders.tsx
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { mockServiceOrders } from '../../data/mockData';
import { StatusBadge } from '../../components/StatusBadge/StatusBadge';
import { Package, Calendar, MapPin } from 'lucide-react';

export const MyOrders = () => {
  const { currentUser } = useApp();

  const myOrders = mockServiceOrders.filter(
    (order) => order.assignedSpecialistId === currentUser.id,
  );

  const activeOrders = myOrders.filter((o) => o.status === 'Active');
  const completedOrders = myOrders.filter((o) => o.status === 'Completed');

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl text-gray-900">My Service Orders</h1>
        <p className="mt-1 text-gray-500">
          View your assigned service orders and their status
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Orders</p>
              <p className="mt-2 text-3xl text-gray-900">
                {myOrders.length}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Package size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Orders</p>
              <p className="mt-2 text-3xl text-gray-900">
                {activeOrders.length}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50 text-green-600">
              <Package size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="mt-2 text-3xl text-gray-900">
                {completedOrders.length}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
              <Package size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Active Orders */}
      {activeOrders.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-lg text-gray-900">Active Orders</h2>
          <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
            {activeOrders.map((order) => (
              <Link
                key={order.id}
                to={`/my-orders/${order.id}`}
                className="block p-6 text-left text-sm transition-colors hover:bg-gray-50"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="text-sm text-gray-900">{order.title}</h3>
                    <p className="mt-1 text-xs text-gray-500">{order.id}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                <div className="grid grid-cols-1 gap-4 text-xs text-gray-600 md:grid-cols-3">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400" />
                    <div>
                      <p className="text-gray-500">Duration</p>
                      <p className="text-gray-900">
                        {order.startDate} - {order.endDate}
                      </p>
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
          <h2 className="mb-4 text-lg text-gray-900">Completed Orders</h2>
          <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
            {completedOrders.map((order) => (
              <Link
                key={order.id}
                to={`/my-orders/${order.id}`}
                className="block p-6 text-left text-sm transition-colors hover:bg-gray-50"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="text-sm text-gray-900">{order.title}</h3>
                    <p className="mt-1 text-xs text-gray-500">{order.id}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                <div className="grid grid-cols-1 gap-4 text-xs text-gray-600 md:grid-cols-3">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400" />
                    <div>
                      <p className="text-gray-500">Duration</p>
                      <p className="text-gray-900">
                        {order.startDate} - {order.endDate}
                      </p>
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

      {/* Empty state */}
      {myOrders.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <Package
            size={48}
            className="mx-auto mb-4 text-gray-400"
          />
          <h3 className="mb-2 text-lg text-gray-900">
            No Service Orders
          </h3>
          <p className="text-gray-500">
            You don&apos;t have any assigned service orders yet.
          </p>
        </div>
      )}
    </div>
  );
};
