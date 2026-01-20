// src/pages/ServiceOfferDetail.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge";
import { ArrowLeft } from "lucide-react";
import { useApp } from "../context/AppContext";
import { getServiceOfferById } from "../api/serviceOffers";
import type { ServiceOffer } from "../types";

export const ServiceOfferDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tokens } = useApp();

  const offerId = Number(id);

  const [offer, setOffer] = useState<ServiceOffer | null>(null);
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
      } catch (e: any) {
        setError(e?.message || "Failed to load offer");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [tokens?.access, offerId]);

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

  // New backend serializer returns:
  // offer.serviceRequest (object), offer.specialists (array), offer.totalCost, offer.offerStatus
  const sr = (offer as any).serviceRequest;
  const specs = Array.isArray((offer as any).specialists) ? (offer as any).specialists : [];
  const totalCost = (offer as any).totalCost;

  const status = (offer as any).offerStatus || (offer as any).status || "DRAFT";

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
            <h1 className="text-2xl text-gray-900">Service Offer {offerId}</h1>
            <p className="text-gray-500 mt-1">
              For: {sr?.title || sr?.requestNumber || "Service Request"}
            </p>
          </div>
          <StatusBadge status={status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Service Request */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg text-gray-900 mb-4">Service Request</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">Request Number</label>
                <p className="text-sm text-gray-900 mt-1">{sr?.requestNumber || "-"}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Title</label>
                <p className="text-sm text-gray-900 mt-1">{sr?.title || "-"}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Type</label>
                <p className="text-sm text-gray-900 mt-1">{sr?.type || "-"}</p>
              </div>

              {sr?.requestNumber && (
                <Link
                  to={`/service-requests/${encodeURIComponent(sr.requestNumber)}`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View Full Request →
                </Link>
              )}
            </div>
          </div>

          {/* Specialists */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg text-gray-900 mb-4">Selected Specialists</h2>

            {specs.length === 0 ? (
              <p className="text-sm text-gray-500">No specialists stored in offer.</p>
            ) : (
              <div className="space-y-3">
                {specs.map((s: any, idx: number) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-sm text-gray-900">{s.name || s.userId || "-"}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {s.materialNumber ? `MAT: ${s.materialNumber}` : ""}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Rate: €{s.dailyRate} • Travel: €{s.travellingCost}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Pricing */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg text-gray-900 mb-4">Pricing</h2>

            {specs.length === 0 ? (
              <p className="text-sm text-gray-500">No pricing available (no specialists).</p>
            ) : (
              <div className="space-y-3">
                {specs.map((s: any, idx: number) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-sm text-gray-900">{s.name || s.userId || "-"}</div>

                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">Daily Rate</label>
                        <p className="text-sm text-gray-900 mt-1">€{Number(s.dailyRate || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Travel Cost per Onsite Day</label>
                        <p className="text-sm text-gray-900 mt-1">€{Number(s.travellingCost || 0).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <label className="text-xs text-gray-500">Specialist Cost</label>
                      <p className="text-sm text-gray-900 mt-1">
                        €{Number(s.specialistCost || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-200">
              <label className="text-xs text-gray-500">Total Cost (Calculated)</label>
              <p className="text-lg text-gray-900 mt-1">
                €{Number(totalCost || 0).toLocaleString()}
              </p>
            </div>
          </div>

        </div>

        {/* Right */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-sm text-gray-900 mb-2">Lifecycle</h2>
            <p className="text-xs text-gray-500">
              Offers: <strong>DRAFT → SUBMITTED → ACCEPTED / REJECTED</strong>
              <br />
              Offer submission happens during creation. Group-3 later sends the decision callback.
            </p>
          </div>

          {status === "ACCEPTED" && (
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
              <p className="text-sm text-blue-700">
                <strong>Accepted:</strong> A Service Order is created automatically.
              </p>
              <Link to="/service-orders" className="text-sm text-blue-700 underline mt-2 inline-block">
                Go to Service Orders →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceOfferDetail;
