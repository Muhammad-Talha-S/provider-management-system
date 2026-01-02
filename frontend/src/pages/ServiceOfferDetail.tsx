import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { mockServiceOffers, mockServiceRequests, mockSpecialists } from '../data/mockData';
import { StatusBadge } from '../components/StatusBadge';
import { ArrowLeft, Save, Send, X } from 'lucide-react';

export const ServiceOfferDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const offer = mockServiceOffers.find((o) => o.id === id);
  const request = offer ? mockServiceRequests.find((r) => r.id === offer.serviceRequestId) : null;
  const specialist = offer ? mockSpecialists.find((s) => s.id === offer.specialistId) : null;

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(offer || {});

  if (!offer || !request) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Service Offer not found</p>
        <button onClick={() => navigate('/service-offers')} className="mt-4 text-blue-600">
          Back to Service Offers
        </button>
      </div>
    );
  }

  const canEdit = offer.status === 'Draft';
  const canSubmit = offer.status === 'Draft';
  const canWithdraw = offer.status === 'Submitted';

  const handleSubmit = () => {
    alert('Offer submitted successfully!');
    navigate('/service-offers');
  };

  const handleWithdraw = () => {
    if (confirm('Are you sure you want to withdraw this offer?')) {
      alert('Offer withdrawn');
      navigate('/service-offers');
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <button
          onClick={() => navigate('/service-offers')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Service Offers
        </button>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl text-gray-900">Service Offer {offer.id}</h1>
            <p className="text-gray-500 mt-1">For: {request.title}</p>
          </div>
          <StatusBadge status={offer.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Service Request Reference */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg text-gray-900 mb-4">Service Request</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">Request ID</label>
                <p className="text-sm text-gray-900 mt-1">{request.id}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Title</label>
                <p className="text-sm text-gray-900 mt-1">{request.title}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Role</label>
                <p className="text-sm text-gray-900 mt-1">{request.role}</p>
              </div>
              <Link to={`/service-requests/${request.id}`} className="text-sm text-blue-600 hover:text-blue-700">
                View Full Request →
              </Link>
            </div>
          </div>

          {/* Specialist Selection */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg text-gray-900 mb-4">Selected Specialist</h2>
            {specialist && (
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-lg">
                  {specialist.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{specialist.name}</p>
                  <p className="text-xs text-gray-500">{specialist.id}</p>
                  {specialist.performanceGrade && (
                    <p className="text-xs text-gray-500 mt-1">Grade: {specialist.performanceGrade}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg text-gray-900 mb-4">Pricing</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500">Daily Rate</label>
                {canEdit && isEditing ? (
                  <input
                    type="number"
                    value={formData.dailyRate}
                    onChange={(e) => setFormData({ ...formData, dailyRate: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                  />
                ) : (
                  <p className="text-sm text-gray-900 mt-1">€{offer.dailyRate}</p>
                )}
              </div>

              <div>
                <label className="text-xs text-gray-500">Travel Cost per Onsite Day</label>
                {canEdit && isEditing ? (
                  <input
                    type="number"
                    value={formData.travelCostPerOnsiteDay}
                    onChange={(e) => setFormData({ ...formData, travelCostPerOnsiteDay: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                  />
                ) : (
                  <p className="text-sm text-gray-900 mt-1">€{offer.travelCostPerOnsiteDay}</p>
                )}
              </div>

              <div className="pt-4 border-t border-gray-200">
                <label className="text-xs text-gray-500">Total Cost (Calculated)</label>
                <p className="text-lg text-gray-900 mt-1">€{offer.totalCost.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Contractual Relationship */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg text-gray-900 mb-4">Contractual Relationship</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500">Relationship Type</label>
                <p className="text-sm text-gray-900 mt-1">
                  <span className="px-3 py-1 bg-gray-100 rounded">{offer.contractualRelationship}</span>
                </p>
              </div>
              
              {offer.contractualRelationship === 'Subcontractor' && offer.subcontractorCompany && (
                <div>
                  <label className="text-xs text-gray-500">Subcontractor Company</label>
                  <p className="text-sm text-gray-900 mt-1">{offer.subcontractorCompany}</p>
                </div>
              )}
            </div>
          </div>

          {/* Match Scores */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg text-gray-900 mb-4">Match Score</h2>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-700">Must-Have Criteria</span>
                  <span className="text-sm text-gray-900">{offer.mustHaveMatchPercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${offer.mustHaveMatchPercentage}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-700">Nice-to-Have Criteria</span>
                  <span className="text-sm text-gray-900">{offer.niceToHaveMatchPercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${offer.niceToHaveMatchPercentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Panel */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-sm text-gray-900 mb-4">Actions</h2>
            
            <div className="space-y-3">
              {canEdit && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Edit Offer
                </button>
              )}

              {canEdit && isEditing && (
                <button
                  onClick={() => {
                    setIsEditing(false);
                    alert('Changes saved as draft');
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  <Save size={18} />
                  Save Draft
                </button>
              )}

              {canSubmit && (
                <button
                  onClick={handleSubmit}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Send size={18} />
                  Submit Offer
                </button>
              )}

              {canWithdraw && (
                <button
                  onClick={handleWithdraw}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <X size={18} />
                  Withdraw Offer
                </button>
              )}

              {(offer.status === 'Accepted' || offer.status === 'Rejected') && (
                <div className="p-3 bg-gray-50 rounded text-sm text-gray-600 text-center">
                  This offer is {offer.status.toLowerCase()} and cannot be modified.
                </div>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
            <h2 className="text-sm text-gray-900 mb-4">Offer Details</h2>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-gray-500">Offer ID</span>
                <p className="text-gray-900 mt-1">{offer.id}</p>
              </div>
              {offer.submittedAt && (
                <div>
                  <span className="text-gray-500">Submitted At</span>
                  <p className="text-gray-900 mt-1">{offer.submittedAt}</p>
                </div>
              )}
              <div>
                <span className="text-gray-500">Status</span>
                <div className="mt-1">
                  <StatusBadge status={offer.status} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceOfferDetail;