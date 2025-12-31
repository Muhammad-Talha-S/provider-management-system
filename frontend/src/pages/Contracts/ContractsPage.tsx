// src/pages/ContractsPage.tsx
import { Link } from 'react-router-dom';
import { mockContracts } from '../../data/mockData';
import { StatusBadge } from '../../components/StatusBadge/StatusBadge';
import { FileCheck } from 'lucide-react';

export const ContractsPage = () => {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl text-gray-900">Contracts</h1>
        <p className="mt-1 text-gray-500">
          Framework contracts and configuration (managed by Service Management
          Group 3)
        </p>
      </div>

      <div className="grid gap-6">
        {mockContracts.map((contract) => (
          <div
            key={contract.id}
            className="rounded-lg border border-gray-200 bg-white p-6"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <FileCheck size={24} />
                </div>
                <div>
                  <h2 className="text-lg text-gray-900">{contract.title}</h2>
                  <p className="mt-1 text-sm text-gray-500">{contract.id}</p>
                </div>
              </div>
              <StatusBadge status={contract.status} />
            </div>

            <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <p className="text-xs text-gray-500">Published</p>
                <p className="mt-1 text-sm text-gray-900">
                  {contract.publishDate}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Contract Period</p>
                <p className="mt-1 text-sm text-gray-900">
                  {contract.startDate} - {contract.endDate}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Offer Deadline</p>
                <p className="mt-1 text-sm text-gray-900">
                  {contract.offerDeadline}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Version</p>
                <p className="mt-1 text-sm text-gray-900">
                  {contract.versionHistory.length}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <p className="mb-2 text-xs text-gray-500">Scope of Work</p>
              <p className="text-sm text-gray-700">{contract.scopeOfWork}</p>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <span className="text-xs text-gray-500">Allowed Roles:</span>
              {contract.allowedRoles.slice(0, 3).map((role) => (
                <span
                  key={role}
                  className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700"
                >
                  {role}
                </span>
              ))}
              {contract.allowedRoles.length > 3 && (
                <span className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700">
                  +{contract.allowedRoles.length - 3} more
                </span>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-gray-200 pt-4 text-sm">
              <div className="text-gray-500">
                {contract.acceptedRequestTypes.length} request types •{' '}
                {contract.allowedDomains.length} domains
              </div>
              <Link
                to={`/contracts/${contract.id}`}
                className="text-blue-600 hover:text-blue-700"
              >
                View Details →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
