import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge";
import { ArrowLeft, FileText, Calendar, MapPin, Languages, CheckCircle, Star, Plus, Clock } from "lucide-react";
import { useApp } from "../context/AppContext";
import { getServiceRequestById } from "../api/serviceRequests";

function parseDeadline(deadline?: string | null): Date | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDeadline(deadline?: string | null): string {
  const d = parseDeadline(deadline);
  if (!d) return "-";
  return d.toLocaleString();
}

function getCountdown(deadline?: string | null): { isExpired: boolean; label: string } {
  const d = parseDeadline(deadline);
  if (!d) return { isExpired: false, label: "No deadline configured" };

  const diffMs = d.getTime() - Date.now();
  if (diffMs <= 0) return { isExpired: true, label: "Expired" };

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const mins = totalMinutes % 60;

  if (days > 0) return { isExpired: false, label: `${days}d ${hours}h left` };
  if (hours > 0) return { isExpired: false, label: `${hours}h ${mins}m left` };
  return { isExpired: false, label: `${mins}m left` };
}

export const ServiceRequestDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tokens, currentUser } = useApp();

  const [request, setRequest] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser?.role === "Contract Coordinator") {
      setError("You do not have access to Service Requests.");
      setLoading(false);
      return;
    }
  }, [currentUser?.role]);

  useEffect(() => {
    if (!tokens?.access || !id) return;
    if (currentUser?.role === "Contract Coordinator") return;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getServiceRequestById(tokens.access, id);
        setRequest(data);
      } catch (e: any) {
        setError(e?.message || "Failed to load service request");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [tokens?.access, id, currentUser?.role]);

  const deadlineInfo = useMemo(() => {
    return getCountdown(request?.offerDeadlineAt);
  }, [request?.offerDeadlineAt]);

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-gray-600">Loading request...</p>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="p-8">
        <div className="text-center">
          <p className="text-gray-500">{error || "Service Request not found"}</p>
          <button onClick={() => navigate("/service-requests")} className="mt-4 text-blue-600 hover:text-blue-700">
            Back to Service Requests
          </button>
        </div>
      </div>
    );
  }

  const contractId = request.linkedContractId;

  const isOpen = request.status === "Open";
  const isDeadlineExpired = deadlineInfo.isExpired;
  const canCreateOffer = isOpen && !isDeadlineExpired;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/service-requests")}
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
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
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
                <p className="text-sm text-gray-900 mt-1">{contractId}</p>
              </div>

              <div>
                <label className="text-xs text-gray-500">Offer Deadline</label>
                <div className="mt-1">
                  <div className="text-sm text-gray-900">{formatDeadline(request.offerDeadlineAt)}</div>
                  <div className={`text-xs mt-1 inline-flex items-center gap-1 ${isDeadlineExpired ? "text-red-600" : "text-gray-500"}`}>
                    <Clock size={12} className={isDeadlineExpired ? "text-red-500" : "text-gray-400"} />
                    {deadlineInfo.label}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500">Cycles</label>
                <p className="text-sm text-gray-900 mt-1">{request.cycles ?? "-"}</p>
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

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg text-gray-900 mb-4">Timeline & Location</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">Start Date</label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar size={16} className="text-gray-400" />
                  <p className="text-sm text-gray-900">{request.startDate || "-"}</p>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">End Date</label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar size={16} className="text-gray-400" />
                  <p className="text-sm text-gray-900">{request.endDate || "-"}</p>
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

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg text-gray-900 mb-4">Task Description</h2>
            <p className="text-sm text-gray-700 leading-relaxed">{request.taskDescription}</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg text-gray-900 mb-4">Requirements</h2>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={18} className="text-red-500" />
                <h3 className="text-sm text-gray-900">Must-Have Criteria</h3>
              </div>
              <div className="space-y-2">
                {request.mustHaveCriteria?.map((criteria: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <span className="text-sm text-gray-900">{criteria.name}</span>
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                      Weight: {criteria.weight}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Star size={18} className="text-blue-500" />
                <h3 className="text-sm text-gray-900">Nice-to-Have Criteria</h3>
              </div>
              <div className="space-y-2">
                {request.niceToHaveCriteria?.map((criteria: any, index: number) => (
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

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Languages size={18} className="text-gray-400" />
              <h2 className="text-lg text-gray-900">Language Requirements</h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {request.requiredLanguages?.map((lang: string, index: number) => (
                <span key={index} className="px-3 py-2 bg-gray-100 text-gray-900 rounded-lg text-sm">
                  {lang}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={18} className="text-gray-400" />
              <h2 className="text-sm text-gray-900">Linked Contract</h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">Contract ID</label>
                <p className="text-sm text-gray-900 mt-1">{contractId}</p>
              </div>

              <Link to={`/contracts/${contractId}`} className="block text-sm text-blue-600 hover:text-blue-700 mt-2">
                View Contract Details →
              </Link>
            </div>
          </div>

          {/* Action Panel */}
          {request.status === "Open" && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-sm text-gray-900 mb-4">Actions</h2>

              {!canCreateOffer && (
                <div className="text-sm text-red-600 mb-3">
                  {isDeadlineExpired
                    ? "Offer deadline has passed. You can no longer submit offers for this request."
                    : "Offers are not available right now."}
                </div>
              )}

              <Link
                to={canCreateOffer ? `/service-offers/create?requestId=${request.id}` : "#"}
                onClick={(e) => {
                  if (!canCreateOffer) e.preventDefault();
                }}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                  canCreateOffer ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-200 text-gray-500 cursor-not-allowed"
                }`}
              >
                <Plus size={20} />
                Create Service Offer
              </Link>
            </div>
          )}

          {request.status === "Closed" && (
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
