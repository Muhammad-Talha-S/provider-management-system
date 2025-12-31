// src/pages/ServiceRequestDetail.tsx
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  mockServiceRequests,
  mockContracts,
} from '../../data/mockData';
import { StatusBadge } from '../../components/StatusBadge/StatusBadge';
import {
  ArrowLeft,
  FileText,
  Calendar,
  MapPin,
  Languages,
  CheckCircle,
  Star,
  Plus,
} from 'lucide-react';

type RouteParams = {
  id: string;
};

export const ServiceRequestDetail = () => {
  const { id } = useParams<RouteParams>();
  const navigate = useNavigate();

  const request = mockServiceRequests.find((r) => r.id === id);
  const contract = request
    ? mockContracts.find((c) => c.id === request.linkedContractId)
    : null;

  if (!request) {
    return (
      <div className="p-8">
        <div className="text-center">
          <p className="text-gray-500">Service Request not found</p>
          <button
            type="button"
            onClick={() => navigate('/service-requests')}
            className="mt-4 text-sm text-blue-600 hover:text-blue-700"
          >
            Back to Service Requests
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate('/service-requests')}
          className="mb-4 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={20} />
          Back to Service Requests
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl text-gray-900">{request.title}</h1>
            <p className="mt-1 text-gray-500">{request.id}</p>
          </div>
          <StatusBadge status={request.status} />
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column - Main Details */}
        <div className="space-y-6 lg:col-span-2">
          {/* Basic Information */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg text-gray-900">
              Request Information
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">
                  Request Type
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  <span className="rounded bg-gray-100 px-2 py-1">
                    {request.type}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500">
                  Linked Contract
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {request.linkedContractId}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Role</label>
                <p className="mt-1 text-sm text-gray-900">
                  {request.role}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500">
                  Technology
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {request.technology}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500">
                  Experience Level
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {request.experienceLevel}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500">
                  Performance Location
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {request.performanceLocation}
                </p>
              </div>
            </div>
          </div>

          {/* Timeline and Location */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg text-gray-900">
              Timeline &amp; Location
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">
                  Start Date
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <Calendar size={16} className="text-gray-400" />
                  <p className="text-sm text-gray-900">
                    {request.startDate}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">End Date</label>
                <div className="mt-1 flex items-center gap-2">
                  <Calendar size={16} className="text-gray-400" />
                  <p className="text-sm text-gray-900">
                    {request.endDate}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">
                  Total Man-Days
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {request.totalManDays} days
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500">
                  Onsite Days
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {request.onsiteDays} days
                </p>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500">
                  Performance Location
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <MapPin size={16} className="text-gray-400" />
                  <p className="text-sm text-gray-900">
                    {request.performanceLocation}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Task Description */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg text-gray-900">
              Task Description
            </h2>
            <p className="text-sm leading-relaxed text-gray-700">
              {request.taskDescription}
            </p>
          </div>

          {/* Requirements */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg text-gray-900">
              Requirements
            </h2>

            {/* Must-Have */}
            <div className="mb-6">
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle
                  size={18}
                  className="text-red-500"
                />
                <h3 className="text-sm text-gray-900">
                  Must-Have Criteria
                </h3>
              </div>
              <div className="space-y-2">
                {request.mustHaveCriteria.map((criteria, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg bg-red-50 p-3"
                  >
                    <span className="text-sm text-gray-900">
                      {criteria.name}
                    </span>
                    <span className="rounded bg-red-100 px-2 py-1 text-xs text-red-700">
                      Weight: {criteria.weight}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Nice-to-Have */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Star size={18} className="text-blue-500" />
                <h3 className="text-sm text-gray-900">
                  Nice-to-Have Criteria
                </h3>
              </div>
              <div className="space-y-2">
                {request.niceToHaveCriteria.map(
                  (criteria, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg bg-blue-50 p-3"
                    >
                      <span className="text-sm text-gray-900">
                        {criteria.name}
                      </span>
                      <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700">
                        Weight: {criteria.weight}%
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>

          {/* Language Requirements */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-2">
              <Languages
                size={18}
                className="text-gray-400"
              />
            <h2 className="text-lg text-gray-900">
              Language Requirements
            </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {request.requiredLanguages.map((lang, index) => (
                <span
                  key={index}
                  className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-900"
                >
                  {lang}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Contract & Actions */}
        <div className="space-y-6">
          {/* Contract Information */}
          {contract && (
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <div className="mb-4 flex items-center gap-2">
                <FileText
                  size={18}
                  className="text-gray-400"
                />
                <h2 className="text-sm text-gray-900">
                  Linked Contract
                </h2>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <label className="text-xs text-gray-500">
                    Contract ID
                  </label>
                  <p className="mt-1 text-gray-900">{contract.id}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">
                    Title
                  </label>
                  <p className="mt-1 text-gray-900">
                    {contract.title}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">
                    Status
                  </label>
                  <div className="mt-1">
                    <StatusBadge status={contract.status} />
                  </div>
                </div>
                <Link
                  to={`/contracts/${contract.id}`}
                  className="mt-2 block text-sm text-blue-600 hover:text-blue-700"
                >
                  View Contract Details →
                </Link>
              </div>
            </div>
          )}

          {/* Actions */}
          {request.status === 'Open' && (
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-sm text-gray-900">
                Actions
              </h2>

              <Link
                to={`/service-offers/create?requestId=${request.id}`}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                <Plus size={20} />
                Create Service Offer
              </Link>
            </div>
          )}

          {request.status === 'Closed' && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
              <p className="text-center text-sm text-gray-600">
                This service request is closed and no longer accepting offers.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
