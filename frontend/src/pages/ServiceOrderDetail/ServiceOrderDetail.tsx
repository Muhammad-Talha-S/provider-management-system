// src/pages/ServiceOrderDetail.tsx
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  mockServiceOrders,
  mockServiceRequests,
  mockSpecialists,
} from '../../data/mockData';
import { StatusBadge } from '../../components/StatusBadge/StatusBadge';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  Building,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { hasAnyRole } from '../../utils/roleHelpers';

type RouteParams = {
  id: string;
};

export const ServiceOrderDetail = () => {
  const { id } = useParams<RouteParams>();
  const navigate = useNavigate();
  const { currentUser } = useApp();

  const order = mockServiceOrders.find((o) => o.id === id);
  const request = order
    ? mockServiceRequests.find((r) => r.id === order.serviceRequestId)
    : null;
  const specialist = order
    ? mockSpecialists.find((s) => s.id === order.specialistId)
    : null;

  const [showSubstitutionForm, setShowSubstitutionForm] =
    useState(false);

  if (!order) {
    return (
      <div className="p-8">
        <div className="text-center">
          <p className="text-gray-500">Service Order not found</p>
          <button
            type="button"
            onClick={() => navigate('/service-orders')}
            className="mt-4 text-sm text-blue-600 hover:text-blue-700"
          >
            Back to Service Orders
          </button>
        </div>
      </div>
    );
  }

  const canRequestSubstitution = hasAnyRole(currentUser, [
    'Supplier Representative',
    'Provider Admin',
  ]);

  const handleRequestSubstitution = () => {
    alert('Substitution request submitted');
    setShowSubstitutionForm(false);
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate('/service-orders')}
          className="mb-4 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={20} />
          Back to Service Orders
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl text-gray-900">Service Order</h1>
            <p className="mt-1 text-gray-500">{order.id}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Order Information */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg text-gray-900">
              Order Information
            </h2>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <label className="text-xs text-gray-500">
                  Service Request
                </label>
                <Link
                  to={`/service-requests/${order.serviceRequestId}`}
                  className="mt-1 block text-blue-600 hover:text-blue-700"
                >
                  {order.serviceRequestId} →
                </Link>
              </div>
              <div>
                <label className="text-xs text-gray-500">Role</label>
                <p className="mt-1 text-gray-900">{order.role}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">
                  Duration
                </label>
                <p className="mt-1 text-gray-900">{order.duration}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">
                  Man-Days
                </label>
                <p className="mt-1 text-gray-900">
                  {order.manDays} days
                </p>
              </div>
            </div>
          </div>

          {/* Timeline & Location */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg text-gray-900">
              Timeline &amp; Location
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Calendar size={18} className="text-gray-400" />
                <div>
                  <label className="text-xs text-gray-500">
                    Start Date
                  </label>
                  <p className="text-gray-900">{order.startDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar size={18} className="text-gray-400" />
                <div>
                  <label className="text-xs text-gray-500">
                    End Date
                  </label>
                  <p className="text-gray-900">{order.endDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin size={18} className="text-gray-400" />
                <div>
                  <label className="text-xs text-gray-500">
                    Location
                  </label>
                  <p className="text-gray-900">{order.location}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Supplier Information */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg text-gray-900">
              Supplier Information
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Building size={18} className="text-gray-400" />
                <div>
                  <label className="text-xs text-gray-500">
                    Supplier Company
                  </label>
                  <p className="text-gray-900">
                    {order.supplierCompany}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">
                  Representative
                </label>
                <p className="mt-1 text-gray-900">
                  {order.representativeName}
                </p>
              </div>
            </div>
          </div>

          {/* Assigned Specialist */}
          {specialist && (
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg text-gray-900">
                Assigned Specialist
              </h2>

              <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  {specialist.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">
                    {specialist.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {specialist.roles.join(', ')}
                  </p>
                </div>
                <Link
                  to={`/specialists/${specialist.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View Profile
                </Link>
              </div>
            </div>
          )}

          {/* Change History */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg text-gray-900">
              Change History
            </h2>

            {order.changeHistory && order.changeHistory.length > 0 ? (
              <div className="space-y-3">
                {order.changeHistory.map((change, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-gray-200 p-4"
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700">
                            {change.type}
                          </span>
                          <StatusBadge status={change.status} />
                        </div>
                        <p className="mt-1 text-sm text-gray-500">
                          Initiated by: {change.initiatedBy}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock size={12} />
                        {change.date}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No change history available
              </p>
            )}
          </div>
        </div>

        {/* Right Column - Actions */}
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-sm text-gray-900">
              Order Summary
            </h2>

            <div className="space-y-3 text-sm">
              <div>
                <label className="text-xs text-gray-500">
                  Order ID
                </label>
                <p className="mt-1 text-gray-900">{order.id}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">
                  Status
                </label>
                <div className="mt-1">
                  <StatusBadge status={order.status} />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">
                  Total Man-Days
                </label>
                <p className="mt-1 text-gray-900">
                  {order.manDays}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          {order.status === 'Active' && canRequestSubstitution && (
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-sm text-gray-900">
                Actions
              </h2>

              {!showSubstitutionForm ? (
                <button
                  type="button"
                  onClick={() => setShowSubstitutionForm(true)}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Request Substitution
                </button>
              ) : (
                <div className="space-y-3 text-sm">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">
                      Replacement Specialist
                    </label>
                    <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option>Select specialist...</option>
                      {mockSpecialists
                        .filter(
                          (s) =>
                            s.id !== order.specialistId &&
                            s.availability === 'Available',
                        )
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">
                      Reason
                    </label>
                    <textarea
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Explain the reason for substitution..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleRequestSubstitution}
                      className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Submit
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSubstitutionForm(false)}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {order.status === 'Active' && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-700">
                <span className="font-semibold">Note:</span> Extensions are
                initiated by the Project Manager externally. You will
                receive a notification if an extension is requested.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
