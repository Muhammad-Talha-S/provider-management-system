import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge";
import { ArrowLeft, Calendar, MapPin, Clock, Building } from "lucide-react";
import { useApp } from "../context/AppContext";
import { hasAnyRole } from "../utils/roleHelpers";
import { getServiceOrderById, requestSubstitution } from "../api/serviceOrders";
import type { ServiceOrder } from "../api/serviceOrders";
import { getSpecialists } from "../api/specialists";

export const ServiceOrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const orderId = Number(id);
  const navigate = useNavigate();
  const { tokens, currentUser, currentProvider } = useApp();

  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [specialists, setSpecialists] = useState<any[]>([]);
  const [showSubstitutionForm, setShowSubstitutionForm] = useState(false);
  const [replacementId, setReplacementId] = useState("");
  const [reason, setReason] = useState("");

  const canRequestSubstitution = hasAnyRole(currentUser, ["Supplier Representative", "Provider Admin"]);

  useEffect(() => {
    if (!tokens?.access || !orderId) return;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const o = await getServiceOrderById(tokens.access, orderId);
        setOrder(o);

        // Specialists list only needed if user can request substitution
        if (canRequestSubstitution) {
          const specs = await getSpecialists(tokens.access);
          const mine = specs.filter((s: any) => s.providerId === currentProvider?.id);
          setSpecialists(mine);
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load service order");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [tokens?.access, orderId, canRequestSubstitution, currentProvider?.id]);

  const replacementOptions = useMemo(() => {
    if (!order) return [];
    return specialists
      .filter((s: any) => s.id !== order.specialistId)
      .filter((s: any) => (s.availability || "") === "Available");
  }, [specialists, order]);

  const currentSpecialist = useMemo(() => {
    if (!order) return null;
    return specialists.find((s: any) => s.id === order.specialistId) || null;
  }, [specialists, order]);

  const handleRequestSubstitution = async () => {
    if (!tokens?.access || !order) return;
    if (!replacementId) return alert("Select replacement specialist");

    try {
      const updated = await requestSubstitution(tokens.access, order.id, {
        newSpecialistId: replacementId,
        reason,
      });
      setOrder(updated);
      setShowSubstitutionForm(false);
      setReplacementId("");
      setReason("");
      alert("Substitution applied.");
    } catch (e: any) {
      alert(e?.message || "Failed to request substitution");
    }
  };

  if (loading) return <div className="p-8 text-gray-600">Loading...</div>;

  if (error || !order) {
    return (
      <div className="p-8">
        <div className="text-center">
          <p className="text-gray-500">{error || "Service Order not found"}</p>
          <button onClick={() => navigate("/service-orders")} className="mt-4 text-blue-600 hover:text-blue-700">
            Back to Service Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <button
          onClick={() => navigate("/service-orders")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Service Orders
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl text-gray-900">Service Order</h1>
            <p className="text-gray-500 mt-1">{order.id}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg text-gray-900 mb-4">Order Information</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">Service Request</label>
                <Link
                  to={`/service-requests/${order.serviceRequestId}`}
                  className="text-sm text-blue-600 hover:text-blue-700 mt-1 block"
                >
                  {order.serviceRequestId} →
                </Link>
              </div>
              <div>
                <label className="text-xs text-gray-500">Title</label>
                <p className="text-sm text-gray-900 mt-1">{order.title}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Man-Days</label>
                <p className="text-sm text-gray-900 mt-1">{order.manDays} days</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Location</label>
                <p className="text-sm text-gray-900 mt-1">{order.location}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg text-gray-900 mb-4">Timeline</h2>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Calendar size={18} className="text-gray-400" />
                <div>
                  <label className="text-xs text-gray-500">Start Date</label>
                  <p className="text-sm text-gray-900">{order.startDate || "-"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar size={18} className="text-gray-400" />
                <div>
                  <label className="text-xs text-gray-500">End Date</label>
                  <p className="text-sm text-gray-900">{order.endDate || "-"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin size={18} className="text-gray-400" />
                <div>
                  <label className="text-xs text-gray-500">Location</label>
                  <p className="text-sm text-gray-900">{order.location}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Supplier Info - minimal for now */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg text-gray-900 mb-4">Supplier Information</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Building size={18} className="text-gray-400" />
                <div>
                  <label className="text-xs text-gray-500">Supplier Company</label>
                  <p className="text-sm text-gray-900">{currentProvider?.name || "Provider"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Assigned Specialist */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg text-gray-900 mb-4">Assigned Specialist</h2>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                {(currentSpecialist?.name || order.specialistId).charAt(0)}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">{currentSpecialist?.name || order.specialistId}</p>
                <p className="text-xs text-gray-500">{order.specialistId}</p>
              </div>
              <Link to={`/specialists/${order.specialistId}`} className="text-sm text-blue-600 hover:text-blue-700">
                View Profile
              </Link>
            </div>
          </div>

          {/* Change History */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg text-gray-900 mb-4">Change History</h2>

            {order.changeHistory && order.changeHistory.length > 0 ? (
              <div className="space-y-3">
                {order.changeHistory.map((change, idx) => (
                  <div key={idx} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                            {change.type}
                          </span>
                          <StatusBadge status={change.status} />
                        </div>
                        <p className="text-sm text-gray-500 mt-1">Initiated by: {change.initiatedBy}</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock size={12} />
                        {change.date}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No change history available</p>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-sm text-gray-900 mb-4">Order Summary</h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">Order ID</label>
                <p className="text-sm text-gray-900 mt-1">{order.id}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Status</label>
                <div className="mt-1">
                  <StatusBadge status={order.status} />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">Total Man-Days</label>
                <p className="text-sm text-gray-900 mt-1">{order.manDays}</p>
              </div>
            </div>
          </div>

          {/* Substitution */}
          {order.status === "Active" && canRequestSubstitution && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-sm text-gray-900 mb-4">Actions</h2>

              {!showSubstitutionForm ? (
                <button
                  onClick={() => setShowSubstitutionForm(true)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Request Substitution
                </button>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Replacement Specialist</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      value={replacementId}
                      onChange={(e) => setReplacementId(e.target.value)}
                    >
                      <option value="">Select specialist...</option>
                      {replacementOptions.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.id})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Only “Available” specialists from the same provider are shown.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Reason</label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      rows={3}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Explain the reason for substitution..."
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleRequestSubstitution}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                    >
                      Submit
                    </button>
                    <button
                      onClick={() => {
                        setShowSubstitutionForm(false);
                        setReplacementId("");
                        setReason("");
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Extension note */}
          {order.status === "Active" && (
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> Extensions are initiated by the Project Manager externally (Group 3).
                You will receive a notification if an extension is requested.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceOrderDetail;
