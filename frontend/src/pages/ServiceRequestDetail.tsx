import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { mockServiceRequests, mockContracts } from '../data/mockData';
import { StatusBadge } from '../components/StatusBadge';
import { ArrowLeft, FileText, Calendar, MapPin, Languages, CheckCircle, Star, Plus } from 'lucide-react';

export const ServiceRequestDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const request = mockServiceRequests.find((r) => r.id === id);
  const contract = request ? mockContracts.find((c) => c.id === request.linkedContractId) : null;

  if (!request) {
    return (
      <div className="p-8">
        <div className="text-center">
          <p className="text-gray-500">Service Request not found</p>
          <button
            onClick={() => navigate('/service-requests')}
            className="mt-4 text-blue-600 hover:text-blue-700"
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
          onClick={() => navigate('/service-requests')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Service Requests
        </button>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl text-gray-900">{request.title}</h1>
            <p className="text-gray-500 mt-1">{request.id}</p>
          </div>
          <StatusBadge status={request.status} />
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg text-gray-900 mb-4">Request Information</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">Request Type</label>
                <p className="text-sm text-gray-900 mt-1">
                  <span className="px-2 py-1 bg-gray-100 rounded">{request.type}</span>
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Linked Contract</label>
                <p className="text-sm text-gray-900 mt-1">{request.linkedContractId}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Role</label>
                <p className="text-sm text-gray-900 mt-1">{request.role}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Technology</label>
                <p className="text-sm text-gray-900 mt-1">{request.technology}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Experience Level</label>
                <p className="text-sm text-gray-900 mt-1">{request.experienceLevel}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Performance Location</label>
                <p className="text-sm text-gray-900 mt-1">{request.performanceLocation}</p>
              </div>
            </div>
          </div>

          {/* Timeline and Location */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg text-gray-900 mb-4">Timeline & Location</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">Start Date</label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar size={16} className="text-gray-400" />
                  <p className="text-sm text-gray-900">{request.startDate}</p>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">End Date</label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar size={16} className="text-gray-400" />
                  <p className="text-sm text-gray-900">{request.endDate}</p>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">Total Man-Days</label>
                <p className="text-sm text-gray-900 mt-1">{request.totalManDays} days</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Onsite Days</label>
                <p className="text-sm text-gray-900 mt-1">{request.onsiteDays} days</p>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500">Performance Location</label>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin size={16} className="text-gray-400" />
                  <p className="text-sm text-gray-900">{request.performanceLocation}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Task Description */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg text-gray-900 mb-4">Task Description</h2>
            <p className="text-sm text-gray-700 leading-relaxed">{request.taskDescription}</p>
          </div>

          {/* Requirements */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg text-gray-900 mb-4">Requirements</h2>
            
            {/* Must-Have */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={18} className="text-red-500" />
                <h3 className="text-sm text-gray-900">Must-Have Criteria</h3>
              </div>
              <div className="space-y-2">
                {request.mustHaveCriteria.map((criteria, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <span className="text-sm text-gray-900">{criteria.name}</span>
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                      Weight: {criteria.weight}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Nice-to-Have */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Star size={18} className="text-blue-500" />
                <h3 className="text-sm text-gray-900">Nice-to-Have Criteria</h3>
              </div>
              <div className="space-y-2">
                {request.niceToHaveCriteria.map((criteria, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm text-gray-900">{criteria.name}</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                      Weight: {criteria.weight}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Language Requirements */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Languages size={18} className="text-gray-400" />
              <h2 className="text-lg text-gray-900">Language Requirements</h2>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {request.requiredLanguages.map((lang, index) => (
                <span key={index} className="px-3 py-2 bg-gray-100 text-gray-900 rounded-lg text-sm">
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
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText size={18} className="text-gray-400" />
                <h2 className="text-sm text-gray-900">Linked Contract</h2>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500">Contract ID</label>
                  <p className="text-sm text-gray-900 mt-1">{contract.id}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Title</label>
                  <p className="text-sm text-gray-900 mt-1">{contract.title}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Status</label>
                  <div className="mt-1">
                    <StatusBadge status={contract.status} />
                  </div>
                </div>
                <Link
                  to={`/contracts/${contract.id}`}
                  className="block text-sm text-blue-600 hover:text-blue-700 mt-2"
                >
                  View Contract Details →
                </Link>
              </div>
            </div>
          )}

          {/* Actions */}
          {request.status === 'Open' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-sm text-gray-900 mb-4">Actions</h2>
              
              <Link
                to={`/service-offers/create?requestId=${request.id}`}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={20} />
                Create Service Offer
              </Link>
            </div>
          )}

          {request.status === 'Closed' && (
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
              <p className="text-sm text-gray-600 text-center">
                This service request is closed and no longer accepting offers.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceRequestDetail;