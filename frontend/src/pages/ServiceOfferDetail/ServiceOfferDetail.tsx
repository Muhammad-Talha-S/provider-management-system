// src/pages/ServiceOfferDetail.tsx
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  mockServiceOffers,
  mockServiceRequests,
  mockSpecialists,
} from '../../data/mockData';
import { StatusBadge } from '../../components/StatusBadge/StatusBadge';
import { ArrowLeft, Save, Send, X } from 'lucide-react';

type RouteParams = {
  id: string;
};

// If you have an Offer type in mockData, use that instead of `any`
type OfferForm = (typeof mockServiceOffers)[number];

export const ServiceOfferDetail = () => {
  const { id } = useParams<RouteParams>();
  const navigate = useNavigate();

  const offer = mockServiceOffers.find((o) => o.id === id);
  const request = offer
    ? mockServiceRequests.find((r) => r.id === offer.serviceRequestId)
    : null;
  const specialist = offer
    ? mockSpecialists.find((s) => s.id === offer.specialistId)
    : null;

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<OfferForm | null>(offer ?? null);

  if (!offer || !request || !formData) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Service Offer not found</p>
        <button
          type="button"
          onClick={() => navigate('/service-offers')}
          className="mt-4 text-sm text-blue-600 hover:text-blue-700"
        >
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
      {/* Header */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate('/service-offers')}
          className="mb-4 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={20} />
          Back to Service Offers
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl text-gray-900">
              Service Offer {offer.id}
            </h1>
            <p className="mt-1 text-gray-500">For: {request.title}</p>
          </div>
          <StatusBadge status={offer.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Service Request Reference */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg text-gray-900">Service Request</h2>
            <div className="space-y-3 text-sm">
              <div>
                <label className="text-xs text-gray-500">Request ID</label>
                <p className="mt-1 text-gray-900">{request.id}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Title</label>
                <p className="mt-1 text-gray-900">{request.title}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Role</label>
                <p className="mt-1 text-gray-900">{request.role}</p>
              </div>
              <Link
                to={`/service-requests/${request.id}`}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                View Full Request →
              </Link>
            </div>
          </div>

          {/* Specialist Selection */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg text-gray-900">
              Selected Specialist
            </h2>
            {specialist && (
              <div className="flex items-center gap-4 rounded-lg bg-gray-50 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg text-blue-600">
                  {specialist.name.charAt(0)}
                </div>
                <div className="flex-1 text-sm">
                  <p className="text-gray-900">{specialist.name}</p>
                  <p className="text-xs text-gray-500">
                    {specialist.id}
                  </p>
                  {specialist.performanceGrade && (
                    <p className="mt-1 text-xs text-gray-500">
                      Grade: {specialist.performanceGrade}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Pricing */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg text-gray-900">Pricing</h2>

            <div className="space-y-4 text-sm">
              <div>
                <label className="text-xs text-gray-500">
                  Daily Rate
                </label>
                {canEdit && isEditing ? (
                  <input
                    type="number"
                    value={formData.dailyRate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dailyRate: Number(e.target.value),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="mt-1 text-gray-900">
                    €{offer.dailyRate}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs text-gray-500">
                  Travel Cost per Onsite Day
                </label>
                {canEdit && isEditing ? (
                  <input
                    type="number"
                    value={formData.travelCostPerOnsiteDay}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        travelCostPerOnsiteDay: Number(
                          e.target.value,
                        ),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="mt-1 text-gray-900">
                    €{offer.travelCostPerOnsiteDay}
                  </p>
                )}
              </div>

              <div className="border-t border-gray-200 pt-4">
                <label className="text-xs text-gray-500">
                  Total Cost (Calculated)
                </label>
                <p className="mt-1 text-lg text-gray-900">
                  €{offer.totalCost.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Contractual Relationship */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg text-gray-900">
              Contractual Relationship
            </h2>

            <div className="space-y-4 text-sm">
              <div>
                <label className="text-xs text-gray-500">
                  Relationship Type
                </label>
                <p className="mt-1 text-gray-900">
                  <span className="rounded bg-gray-100 px-3 py-1">
                    {offer.contractualRelationship}
                  </span>
                </p>
              </div>

              {offer.contractualRelationship === 'Subcontractor' &&
                offer.subcontractorCompany && (
                  <div>
                    <label className="text-xs text-gray-500">
                      Subcontractor Company
                    </label>
                    <p className="mt-1 text-gray-900">
                      {offer.subcontractorCompany}
                    </p>
                  </div>
                )}
            </div>
          </div>

          {/* Match Scores */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg text-gray-900">
              Match Score
            </h2>

            <div className="space-y-4 text-sm">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-gray-700">
                    Must-Have Criteria
                  </span>
                  <span className="text-gray-900">
                    {offer.mustHaveMatchPercentage}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-green-500"
                    style={{
                      width: `${offer.mustHaveMatchPercentage}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-gray-700">
                    Nice-to-Have Criteria
                  </span>
                  <span className="text-gray-900">
                    {offer.niceToHaveMatchPercentage}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{
                      width: `${offer.niceToHaveMatchPercentage}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Panel */}
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-sm text-gray-900">Actions</h2>

            <div className="space-y-3">
              {canEdit && !isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Edit Offer
                </button>
              )}

              {canEdit && isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    alert('Changes saved as draft');
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
                >
                  <Save size={18} />
                  Save Draft
                </button>
              )}

              {canSubmit && (
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  <Send size={18} />
                  Submit Offer
                </button>
              )}

              {canWithdraw && (
                <button
                  type="button"
                  onClick={handleWithdraw}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                >
                  <X size={18} />
                  Withdraw Offer
                </button>
              )}

              {(offer.status === 'Accepted' ||
                offer.status === 'Rejected') && (
                <div className="rounded bg-gray-50 p-3 text-center text-sm text-gray-600">
                  This offer is {offer.status.toLowerCase()} and
                  cannot be modified.
                </div>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
            <h2 className="mb-4 text-sm text-gray-900">
              Offer Details
            </h2>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-gray-500">Offer ID</span>
                <p className="mt-1 text-gray-900">{offer.id}</p>
              </div>
              {offer.submittedAt && (
                <div>
                  <span className="text-gray-500">
                    Submitted At
                  </span>
                  <p className="mt-1 text-gray-900">
                    {offer.submittedAt}
                  </p>
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
