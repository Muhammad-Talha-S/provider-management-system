import { Link } from 'react-router-dom';
import { FileText, Send, Package, Users, TrendingUp, Clock, type LucideIcon } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  mockServiceRequests,
  mockServiceOffers,
  mockServiceOrders,
  mockSpecialists,
} from '../../data/mockData';
import { StatusBadge } from '../../components/StatusBadge/StatusBadge';

type StatCard = {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string; // Tailwind utility classes
  link: string;
};

export const Dashboard = () => {
  const { currentUser } = useApp();

  const stats: StatCard[] = [
    {
      label: 'Open Service Requests',
      value: mockServiceRequests.filter((sr:any) => sr.status === 'Open').length,
      icon: FileText,
      color: 'bg-blue-50 text-blue-600',
      link: '/service-requests',
    },
    {
      label: 'Pending Offers',
      value: mockServiceOffers.filter((so:any) => so.status === 'Submitted').length,
      icon: Send,
      color: 'bg-yellow-50 text-yellow-600',
      link: '/service-offers',
    },
    {
      label: 'Active Orders',
      value: mockServiceOrders.filter((so: any) => so.status === 'Active').length,
      icon: Package,
      color: 'bg-green-50 text-green-600',
      link: '/service-orders',
    },
    {
      label: 'Available Specialists',
      value: mockSpecialists.filter((sp:any) => sp.availability === 'Available').length,
      icon: Users,
      color: 'bg-purple-50 text-purple-600',
      link: '/specialists',
    },
  ];

  const openServiceRequests = mockServiceRequests
    .filter((sr) => sr.status === 'Open')
    .slice(0, 5);

  const recentOffers = mockServiceOffers
    .filter((so) => so.submittedAt)
    .slice(0, 5);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl text-gray-900">
          Welcome back, {currentUser.name}
        </h1>
        <p className="mt-1 text-gray-500">
          Here&apos;s what&apos;s happening with your provider account
        </p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              to={stat.link}
              className="rounded-lg border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="mt-2 text-3xl text-gray-900">{stat.value}</p>
                </div>
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.color}`}
                >
                  <Icon size={24} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Open Service Requests */}
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 p-6">
            <h2 className="text-lg text-gray-900">Open Service Requests</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {openServiceRequests.length > 0 ? (
              openServiceRequests.map((sr) => (
                <Link
                  key={sr.id}
                  to={`/service-requests/${sr.id}`}
                  className="block p-6 transition-colors hover:bg-gray-50"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm text-gray-900">{sr.title}</h3>
                      <p className="mt-1 text-xs text-gray-500">{sr.id}</p>
                    </div>
                    <StatusBadge status={sr.status} />
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <FileText size={14} />
                      {sr.role}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {sr.totalManDays} days
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-6 text-center text-sm text-gray-500">
                No open service requests
              </div>
            )}
          </div>
          <div className="border-t border-gray-200 p-4">
            <Link
              to="/service-requests"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View all requests →
            </Link>
          </div>
        </div>

        {/* Recent Offers */}
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 p-6">
            <h2 className="text-lg text-gray-900">Recent Service Offers</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {recentOffers.length > 0 ? (
              recentOffers.map((offer) => {
                const specialist = mockSpecialists.find(
                  (sp) => sp.id === offer.specialistId,
                );
                const serviceRequest = mockServiceRequests.find(
                  (sr) => sr.id === offer.serviceRequestId,
                );

                return (
                  <Link
                    key={offer.id}
                    to={`/service-offers/${offer.id}`}
                    className="block p-6 transition-colors hover:bg-gray-50"
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-sm text-gray-900">
                          {serviceRequest?.title ?? 'N/A'}
                        </h3>
                        <p className="mt-1 text-xs text-gray-500">
                          {specialist?.name ?? 'N/A'}
                        </p>
                      </div>
                      {/* <StatusBadge status={offer.status} /> */}
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <TrendingUp size={14} />
                        €{offer.dailyRate}/day
                      </span>
                      <span>
                        Total: €{offer.totalCost.toLocaleString()}
                      </span>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="p-6 text-center text-sm text-gray-500">
                No recent offers
              </div>
            )}
          </div>
          <div className="border-t border-gray-200 p-4">
            <Link
              to="/service-offers"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View all offers →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
