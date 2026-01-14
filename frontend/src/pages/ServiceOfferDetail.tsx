import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge";
import { ArrowLeft, Send, X } from "lucide-react";
import { useApp } from "../context/AppContext";
import { getServiceOfferById, updateServiceOfferStatus } from "../api/serviceOffers";
import type { ServiceOffer } from "../api/serviceOffers";
import { getServiceRequestById } from "../api/serviceRequests";
import { getSpecialists } from "../api/specialists";

export const ServiceOfferDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tokens, currentProvider } = useApp();

  const offerId = Number(id);

  const [offer, setOffer] = useState<ServiceOffer | null>(null);
  const [request, setRequest] = useState<any | null>(null);
  const [specialistName, setSpecialistName] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tokens?.access || !offerId) return;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const o = await getServiceOfferById(tokens.access, offerId);
        setOffer(o);

        const sr = await getServiceRequestById(tokens.access, o.serviceRequestId);
        setRequest(sr);

        // Optional specialist name lookup
        const specs = await getSpecialists(tokens.access);
        const mine = specs.filter((s: any) => s.providerId === currentProvider?.id);
        const found = mine.find((s: any) => s.id === o.specialistId);
        setSpecialistName(found?.name || "");
      } catch (e: any) {
        setError(e?.message || "Failed to load offer");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [tokens?.access, offerId, currentProvider?.id]);

  const canSubmit = useMemo(() => offer?.status === "Draft", [offer?.status]);
  const canWithdraw = useMemo(() => offer?.status === "Submitted", [offer?.status]);

  const onSubmit = async () => {
    if (!tokens?.access || !offer) return;
    try {
      const updated = await updateServiceOfferStatus(tokens.access, offer.id, "Submitted");
      setOffer(updated);
      alert("Offer submitted!");
    } catch (e: any) {
      alert(e?.message || "Failed to submit offer");
    }
  };

  const onWithdraw = async () => {
    if (!tokens?.access || !offer) return;
    if (!confirm("Withdraw this offer?")) return;
    try {
      const updated = await updateServiceOfferStatus(tokens.access, offer.id, "Withdrawn");
      setOffer(updated);
      alert("Offer withdrawn.");
    } catch (e: any) {
      alert(e?.message || "Failed to withdraw offer");
    }
  };

  if (loading) return <div className="p-8 text-gray-600">Loading...</div>;

  if (error || !offer) {
    return (
      <div className="p-8">
        <p className="text-gray-500">{error || "Service Offer not found"}</p>
        <button onClick={() => navigate("/service-offers")} className="mt-4 text-blue-600">
          Back to Service Offers
        </button>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <button
          onClick={() => navigate("/service-offers")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Service Offers
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl text-gray-900">Service Offer {offer.id}</h1>
            <p className="text-gray-500 mt-1">For: {request?.title || offer.serviceRequestId}</p>
          </div>
          <StatusBadge status={offer.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg text-gray-900 mb-4">Service Request</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">Request ID</label>
                <p className="text-sm text-gray-900 mt-1">{offer.serviceRequestId}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Title</label>
                <p className="text-sm text-gray-900 mt-1">{request?.title || "-"}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Role</label>
                <p className="text-sm text-gray-900 mt-1">{request?.role || "-"}</p>
              </div>
              <Link to={`/service-requests/${offer.serviceRequestId}`} className="text-sm text-blue-600 hover:text-blue-700">
                View Full Request →
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg text-gray-900 mb-4">Selected Specialist</h2>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-900">{specialistName || offer.specialistId}</p>
              <p className="text-xs text-gray-500">{offer.specialistId}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg text-gray-900 mb-4">Pricing</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Daily Rate</span>
                <span className="text-gray-900">€{offer.daily_rate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Travel Cost / Onsite Day</span>
                <span className="text-gray-900">€{offer.travelCostPerOnsiteDay}</span>
              </div>
              <div className="border-t pt-3 flex justify-between">
                <span className="text-gray-900">Total Cost</span>
                <span className="text-gray-900">€{Number(offer.total_cost).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg text-gray-900 mb-4">Match Score</h2>
            <div className="text-sm text-gray-700">
              Must: <strong>{offer.mustHaveMatchPercentage ?? "-"}</strong>%<br />
              Nice: <strong>{offer.niceToHaveMatchPercentage ?? "-"}</strong>%
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-sm text-gray-900 mb-4">Actions</h2>

            <div className="space-y-3">
              {canSubmit && (
                <button
                  onClick={onSubmit}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Send size={18} />
                  Submit Offer
                </button>
              )}

              {canWithdraw && (
                <button
                  onClick={onWithdraw}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <X size={18} />
                  Withdraw Offer
                </button>
              )}

              {(offer.status === "Accepted" || offer.status === "Rejected") && (
                <div className="p-3 bg-gray-50 rounded text-sm text-gray-600 text-center">
                  This offer is {offer.status.toLowerCase()} and cannot be modified.
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
            <h2 className="text-sm text-gray-900 mb-4">Offer Details</h2>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-gray-500">Offer ID</span>
                <p className="text-gray-900 mt-1">{offer.id}</p>
              </div>
              {offer.submitted_at && (
                <div>
                  <span className="text-gray-500">Submitted At</span>
                  <p className="text-gray-900 mt-1">{offer.submitted_at}</p>
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

          {offer.status === "Accepted" && (
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> Once accepted, a Service Order is created automatically.
              </p>
              <Link to="/service-orders" className="text-sm text-blue-700 underline mt-2 inline-block">
                Go to Service Orders →
              </Link>
                <button
                  className="text-sm text-blue-700 underline"
                  onClick={() => navigate(0)}
                  type="button"
                >
                  Refresh
                </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceOfferDetail;
