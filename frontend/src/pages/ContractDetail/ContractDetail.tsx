// src/pages/ContractDetail.tsx
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { mockContracts } from '../../data/mockData';
import { StatusBadge } from '../../components/StatusBadge/StatusBadge';
import {
  ArrowLeft,
  Calendar,
  FileText,
  DollarSign,
  Settings,
  History,
  BookOpen,
  File,
} from 'lucide-react';

type RouteParams = {
  id: string;
};

type ContractTab =
  | 'overview'
  | 'governance'
  | 'configuration'
  | 'pricing'
  | 'versions';

export const ContractDetail = () => {
  const { id } = useParams<RouteParams>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ContractTab>('overview');

  const contract = mockContracts.find((c) => c.id === id);

  if (!contract) {
    return (
      <div className="p-8">
        <div className="text-center">
          <p className="text-gray-500">Contract not found</p>
          <button
            type="button"
            onClick={() => navigate('/contracts')}
            className="mt-4 text-sm text-blue-600 hover:text-blue-700"
          >
            Back to Contracts
          </button>
        </div>
      </div>
    );
  }

  const durationMonths = Math.round(
    (new Date(contract.endDate).getTime() -
      new Date(contract.startDate).getTime()) /
      (1000 * 60 * 60 * 24 * 30),
  );

  const latestVersion =
    contract.versionHistory[contract.versionHistory.length - 1];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate('/contracts')}
          className="mb-4 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={20} />
          Back to Contracts
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl text-gray-900">{contract.title}</h1>
            <p className="mt-1 text-gray-500">{contract.id}</p>
          </div>
          <StatusBadge status={contract.status} />
        </div>
      </div>

      {/* Info Banner */}
      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">Note:</span> All contract
          information is read-only within the Provider Management
          System. Contract details are managed by Service Management
          (Group 3).
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`whitespace-nowrap border-b-2 px-1 pb-4 transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2 text-sm">
              <FileText size={18} />
              Contract Overview
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('governance')}
            className={`whitespace-nowrap border-b-2 px-1 pb-4 transition-colors ${
              activeTab === 'governance'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2 text-sm">
              <BookOpen size={18} />
              Scope &amp; Governance
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('configuration')}
            className={`whitespace-nowrap border-b-2 px-1 pb-4 transition-colors ${
              activeTab === 'configuration'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2 text-sm">
              <Settings size={18} />
              Allowed Configuration
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pricing')}
            className={`whitespace-nowrap border-b-2 px-1 pb-4 transition-colors ${
              activeTab === 'pricing'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2 text-sm">
              <DollarSign size={18} />
              Pricing Rules
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('versions')}
            className={`whitespace-nowrap border-b-2 px-1 pb-4 transition-colors ${
              activeTab === 'versions'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2 text-sm">
              <History size={18} />
              Versions &amp; Documents
            </span>
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column - Main Details */}
          <div className="space-y-6 lg:col-span-2">
            {/* Timeline */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg text-gray-900">
                Contract Timeline
              </h2>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-xs text-gray-500">
                    Publishing Date
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    <p className="text-gray-900">
                      {contract.publishDate}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500">
                    Offer Deadline
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    <p className="text-gray-900">
                      {contract.offerDeadline}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500">
                    Start Date
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    <p className="text-gray-900">
                      {contract.startDate}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500">
                    End Date
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    <p className="text-gray-900">
                      {contract.endDate}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg text-gray-900">
                Contract Summary
              </h2>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-xs text-gray-500">
                    Contract ID
                  </label>
                  <p className="mt-1 text-gray-900">
                    {contract.id}
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
                <div>
                  <label className="text-xs text-gray-500">
                    Duration
                  </label>
                  <p className="mt-1 text-gray-900">
                    {durationMonths} months
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">
                    Current Version
                  </label>
                  <p className="mt-1 text-gray-900">
                    v{latestVersion.version}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Status Info */}
          <div className="space-y-6">
            {contract.status === 'Active' && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="flex items-start gap-3">
                  <Settings
                    size={20}
                    className="mt-0.5 text-green-600"
                  />
                  <div>
                    <p className="text-sm text-green-900">
                      Active Contract
                    </p>
                    <p className="mt-1 text-xs text-green-700">
                      This contract is currently active and accepting
                      service requests.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Configuration Summary */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="mb-4 text-sm text-gray-900">
                Configuration Summary
              </h3>

              <div className="space-y-3 text-sm">
                <div>
                  <label className="text-xs text-gray-500">
                    Request Types
                  </label>
                  <p className="mt-1 text-gray-900">
                    {contract.acceptedRequestTypes.length} types
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">
                    Allowed Domains
                  </label>
                  <p className="mt-1 text-gray-900">
                    {contract.allowedDomains.length} domains
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">
                    Allowed Roles
                  </label>
                  <p className="mt-1 text-gray-900">
                    {contract.allowedRoles.length} roles
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">
                    Pricing Rules
                  </label>
                  <p className="mt-1 text-gray-900">
                    {contract.pricingLimits.length} configured
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'governance' && (
        <div className="space-y-6">
          {/* Scope of Work */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg text-gray-900">
              Scope of Work
            </h2>
            <p className="text-sm leading-relaxed text-gray-700">
              {contract.scopeOfWork}
            </p>
          </div>

          {/* Terms and Conditions */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg text-gray-900">
              Terms and Conditions
            </h2>
            <p className="text-sm leading-relaxed text-gray-700">
              {contract.termsAndConditions ??
                'Standard terms and conditions apply as per framework agreement.'}
            </p>
          </div>

          {/* Weighting */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg text-gray-900">
              Functional vs Commercial Weighting
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="text-xs text-gray-500">
                  Functional Weight
                </label>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-3 flex-1 rounded-full bg-gray-200">
                    <div
                      className="h-3 rounded-full bg-blue-600"
                      style={{
                        width: `${contract.functionalWeight ?? 50}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-gray-900">
                    {contract.functionalWeight ?? 50}%
                  </span>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">
                  Commercial Weight
                </label>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-3 flex-1 rounded-full bg-gray-200">
                    <div
                      className="h-3 rounded-full bg-green-600"
                      style={{
                        width: `${contract.commercialWeight ?? 50}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-gray-900">
                    {contract.commercialWeight ?? 50}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'configuration' && (
        <div className="space-y-6">
          {/* Allowed Parameters */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-6 text-lg text-gray-900">
              Allowed Configuration Parameters
            </h2>

            <div className="space-y-6 text-sm">
              <div>
                <label className="mb-3 block text-sm text-gray-700">
                  Allowed Domains
                </label>
                <div className="flex flex-wrap gap-2">
                  {contract.allowedDomains.map((domain, index) => (
                    <span
                      key={index}
                      className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"
                    >
                      {domain}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-3 block text-sm text-gray-700">
                  Allowed Roles
                </label>
                <div className="flex flex-wrap gap-2">
                  {contract.allowedRoles.map((role, index) => (
                    <span
                      key={index}
                      className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-sm text-purple-700"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-3 block text-sm text-gray-700">
                  Experience Levels
                </label>
                <div className="flex flex-wrap gap-2">
                  {contract.experienceLevels.map((level, index) => (
                    <span
                      key={index}
                      className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700"
                    >
                      {level}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Service Request Types */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-6 text-lg text-gray-900">
              Allowed Service Request Types
            </h2>

            <div className="space-y-4 text-sm">
              {contract.acceptedRequestTypes.map((type, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-4"
                >
                  <span className="text-gray-900">{type}</span>
                  <span className="rounded bg-blue-100 px-3 py-1 text-xs text-blue-700">
                    Accepted
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Offer Cycles */}
          {contract.offerCyclesAndDeadlines &&
            contract.offerCyclesAndDeadlines.length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-white">
                <div className="border-b border-gray-200 p-6">
                  <h2 className="text-lg text-gray-900">
                    Offer Cycles and Deadlines
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500">
                          Request Type
                        </th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500">
                          Offer Cycle
                        </th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500">
                          Response Deadline
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {contract.offerCyclesAndDeadlines.map(
                        (cycle, index) => (
                          <tr
                            key={index}
                            className="hover:bg-gray-50"
                          >
                            <td className="px-6 py-4 text-gray-900">
                              {cycle.requestType}
                            </td>
                            <td className="px-6 py-4 text-gray-900">
                              {cycle.cycle}
                            </td>
                            <td className="px-6 py-4 text-gray-900">
                              {cycle.deadline}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
        </div>
      )}

      {activeTab === 'pricing' && (
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 p-6">
            <h2 className="text-lg text-gray-900">
              Pricing Rules and Maximum Daily Rates
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Maximum daily rates defined per role, experience level,
              and technology level.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500">
                    Role
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500">
                    Experience Level
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500">
                    Technology Level
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500">
                    Maximum Daily Rate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {contract.pricingLimits.map((limit, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-900">
                      {limit.role}
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-700">
                        {limit.experienceLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {limit.technologyLevel ? (
                        <span className="rounded bg-purple-50 px-2 py-1 text-xs text-purple-700">
                          {limit.technologyLevel}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">
                        €{limit.maxRate.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'versions' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-2 text-lg text-gray-900">
              Version History &amp; Documents
            </h2>
            <p className="text-sm text-gray-500">
              Complete history of contract versions with status and
              downloadable documents.
            </p>
          </div>

          {contract.versionHistory.map((version, index) => (
            <div
              key={index}
              className="rounded-lg border border-gray-200 bg-white p-6"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                    <span className="text-sm text-blue-600">
                      v{version.version}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-900">
                      Version {version.version}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {version.date}
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs ${
                    version.status === 'Signed'
                      ? 'bg-green-100 text-green-700'
                      : version.status === 'Proposed'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {version.status}
                </span>
              </div>

              <div className="mb-4">
                <label className="text-xs text-gray-500">
                  Changes
                </label>
                <p className="mt-1 text-sm text-gray-700">
                  {version.changes}
                </p>
              </div>

              {version.documentLink && (
                <div className="flex items-center gap-2 border-t border-gray-200 pt-4">
                  <File
                    size={16}
                    className="text-gray-400"
                  />
                  <a
                    href={version.documentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Download Contract Document (PDF)
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
