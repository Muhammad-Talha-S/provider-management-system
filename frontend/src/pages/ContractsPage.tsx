import React from 'react';
import { Link } from 'react-router-dom';
import { mockContracts } from '../data/mockData';
import { StatusBadge } from '../components/StatusBadge';
import { FileCheck, Calendar } from 'lucide-react';

export const ContractsPage: React.FC = () => {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl text-gray-900">Contracts</h1>
        <p className="text-gray-500 mt-1">
          Framework contracts and configuration (managed by Service Management Group 3)
        </p>
      </div>

      <div className="grid gap-6">
        {mockContracts.map((contract) => (
          <div key={contract.id} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileCheck size={24} />
                </div>
                <div>
                  <h2 className="text-lg text-gray-900">{contract.title}</h2>
                  <p className="text-sm text-gray-500 mt-1">{contract.id}</p>
                </div>
              </div>
              <StatusBadge status={contract.status} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-500">Published</p>
                <p className="text-sm text-gray-900 mt-1">{contract.publishDate}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Contract Period</p>
                <p className="text-sm text-gray-900 mt-1">{contract.startDate} - {contract.endDate}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Offer Deadline</p>
                <p className="text-sm text-gray-900 mt-1">{contract.offerDeadline}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Version</p>
                <p className="text-sm text-gray-900 mt-1">{contract.versionHistory.length}</p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Scope of Work</p>
              <p className="text-sm text-gray-700">{contract.scopeOfWork}</p>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-xs text-gray-500">Allowed Roles:</span>
              {contract.allowedRoles.slice(0, 3).map((role) => (
                <span key={role} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs">
                  {role}
                </span>
              ))}
              {contract.allowedRoles.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs">
                  +{contract.allowedRoles.length - 3} more
                </span>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                {contract.acceptedRequestTypes.length} request types • {contract.allowedDomains.length} domains
              </div>
              <Link to={`/contracts/${contract.id}`} className="text-sm text-blue-600 hover:text-blue-700">
                View Details →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ContractsPage;