import React from 'react';
import { useApp } from '../context/AppContext';
import { FileText, Send, Package, Users, TrendingUp, Clock } from 'lucide-react';
import { mockServiceRequests, mockServiceOffers, mockServiceOrders, mockSpecialists } from '../data/mockData';
import { StatusBadge } from '../components/StatusBadge';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { currentUser } = useApp();

  const stats = [
    {
      label: 'Open Service Requests',
      value: mockServiceRequests.filter((sr) => sr.status === 'Open').length,
      icon: FileText,
      color: 'bg-blue-50 text-blue-600',
      link: '/service-requests',
    },
    {
      label: 'Pending Offers',
      value: mockServiceOffers.filter((so) => so.status === 'Submitted').length,
      icon: Send,
      color: 'bg-yellow-50 text-yellow-600',
      link: '/service-offers',
    },
    {
      label: 'Active Orders',
      value: mockServiceOrders.filter((so) => so.status === 'Active').length,
      icon: Package,
      color: 'bg-green-50 text-green-600',
      link: '/service-orders',
    },
    {
      label: 'Available Specialists',
      value: mockSpecialists.filter((sp) => sp.availability === 'Available').length,
      icon: Users,
      color: 'bg-purple-50 text-purple-600',
      link: '/specialists',
    },
  ];

  const openServiceRequests = mockServiceRequests.filter((sr) => sr.status === 'Open').slice(0, 5);
  const recentOffers = mockServiceOffers.filter((so) => so.submittedAt).slice(0, 5);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl text-gray-900">Welcome back, {currentUser.name}</h1>
        <p className="text-gray-500 mt-1">Here's what's happening with your provider account</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              to={stat.link}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-3xl text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center`}>
                  <Icon size={24} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Open Service Requests */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg text-gray-900">Open Service Requests</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {openServiceRequests.length > 0 ? (
              openServiceRequests.map((sr) => (
                <Link
                  key={sr.id}
                  to={`/service-requests/${sr.id}`}
                  className="p-6 hover:bg-gray-50 transition-colors block"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-sm text-gray-900">{sr.title}</h3>
                      <p className="text-xs text-gray-500 mt-1">{sr.id}</p>
                    </div>
                    <StatusBadge status={sr.status} />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
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
              <div className="p-6 text-center text-gray-500 text-sm">No open service requests</div>
            )}
          </div>
          <div className="p-4 border-t border-gray-200">
            <Link to="/service-requests" className="text-sm text-blue-600 hover:text-blue-700">
              View all requests →
            </Link>
          </div>
        </div>

        {/* Recent Offers */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg text-gray-900">Recent Service Offers</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {recentOffers.length > 0 ? (
              recentOffers.map((offer) => {
                const specialist = mockSpecialists.find((sp) => sp.id === offer.specialistId);
                const serviceRequest = mockServiceRequests.find((sr) => sr.id === offer.serviceRequestId);
                return (
                  <Link
                    key={offer.id}
                    to={`/service-offers/${offer.id}`}
                    className="p-6 hover:bg-gray-50 transition-colors block"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="text-sm text-gray-900">{serviceRequest?.title || 'N/A'}</h3>
                        <p className="text-xs text-gray-500 mt-1">{specialist?.name || 'N/A'}</p>
                      </div>
                      <StatusBadge status={offer.status} />
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
                      <span className="flex items-center gap-1">
                        <TrendingUp size={14} />
                        €{offer.dailyRate}/day
                      </span>
                      <span>Total: €{offer.totalCost.toLocaleString()}</span>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="p-6 text-center text-gray-500 text-sm">No recent offers</div>
            )}
          </div>
          <div className="p-4 border-t border-gray-200">
            <Link to="/service-offers" className="text-sm text-blue-600 hover:text-blue-700">
              View all offers →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;