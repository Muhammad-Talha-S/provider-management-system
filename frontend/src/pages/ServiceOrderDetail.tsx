import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, Clock } from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import { useApp } from "../context/AppContext";

import { getServiceOrderById } from "../api/serviceOrders";

import {
  listChangeRequests,
  decideChangeRequest,
  requestSubstitution,
} from "../api/serviceOrderChangeRequests";
import type { ServiceOrderChangeRequest } from "../api/serviceOrderChangeRequests";

import { getSpecialists } from "../api/specialists";
import type { Specialist } from "../types";

/**
 * This page needs a "rich" order shape (title/dates/location/manDays/assignments).
 * The list view types.ts ServiceOrder is minimal, so we define a local detail type.
 */
type ServiceOrderDetailModel = {
  id: number;
  serviceOfferId: number;
  serviceRequestId: string;
  providerId: string;

  title: string;
  startDate?: string | null;
  endDate?: string | null;
  location: string;
  manDays: number;

  totalCost: string | number;
  status: "ACTIVE" | "COMPLETED";

  assignments?: Array<{
    specialistId: string;
    specialistName?: string;
    materialNumber?: string;
  }>;
};

function firstAssignedSpecialistId(order: ServiceOrderDetailModel): string {
  if (order.assignments && order.assignments.length > 0) {
    return order.assignments[0].specialistId;
  }
  return "-";
}

export const ServiceOrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, tokens, currentProvider } = useApp();

  const [order, setOrder] = useState<ServiceOrderDetailModel | null>(null);
  const [changeRequests, setChangeRequests] = useState<ServiceOrderChangeRequest[]>([]);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [showSubstitutionForm, setShowSubstitutionForm] = useState(false);
  const [newSpecialistId, setNewSpecialistId] = useState("");
  const [reason, setReason] = useState("");

  const access = tokens?.access || "";

  const canProviderAct = useMemo(() => {
    const role = currentUser?.role;
    return role === "Supplier Representative" || role === "Provider Admin";
  }, [currentUser]);

  const refreshAll = async () => {
    if (!access || !id) return;

    setLoading(true);
    setErr(null);

    try {
      // NOTE: getServiceOrderById currently returns whatever backend shape it provides.
      // We treat it as a rich detail model for this detail page.
      const o = (await getServiceOrderById(access, Number(id))) as unknown as ServiceOrderDetailModel;
      setOrder(o);

      const cr = await listChangeRequests(access);
      setChangeRequests(cr.filter((x) => x.serviceOrderId === Number(id)));

      if (canProviderAct) {
        const sp = await getSpecialists(access);

        const currentSpecialistId = firstAssignedSpecialistId(o);

        const filtered = sp.filter(
          (s: any) =>
            s.providerId === currentProvider?.id &&
            s.id !== currentSpecialistId &&
            String(s.availability || "") !== "Fully Booked"
        );

        setSpecialists(filtered);
      }
    } catch (e: any) {
      setErr(e?.message || "Failed to load order");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access, id]);

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-gray-600">Loading order...</p>
      </div>
    );
  }

  if (err || !order) {
    return (
      <div className="p-8">
        <div className="text-center">
          <p className="text-gray-500">{err || "Service Order not found"}</p>
          <button
            onClick={() => navigate("/service-orders")}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Back to Service Orders
          </button>
        </div>
      </div>
    );
  }

  const specialistId = firstAssignedSpecialistId(order);

  const handleDecision = async (crId: number, decision: "Approve" | "Decline") => {
    try {
      if (!access) throw new Error("Not authenticated");
      await decideChangeRequest(access, crId, { decision });
      await refreshAll();
    } catch (e: any) {
      alert(e?.message || "Failed to update request");
    }
  };

  const handleSubstitutionRequest = async () => {
    try {
      if (!access) throw new Error("Not authenticated");
      if (!newSpecialistId) return alert("Select a replacement specialist");

      await requestSubstitution(access, {
        serviceOrderId: order.id,
        newSpecialistId,
        reason,
      });

      setShowSubstitutionForm(false);
      setNewSpecialistId("");
      setReason("");
      await refreshAll();
    } catch (e: any) {
      alert(e?.message || "Failed to request substitution");
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
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
            <p className="text-gray-500 mt-1">#{order.id}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Information */}
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
                <label className="text-xs text-gray-500">Specialist</label>
                <p className="text-sm text-gray-900 mt-1">{specialistId}</p>
              </div>

              <div>
                <label className="text-xs text-gray-500">Title</label>
                <p className="text-sm text-gray-900 mt-1">{order.title || "-"}</p>
              </div>

              <div>
                <label className="text-xs text-gray-500">Man-Days</label>
                <p className="text-sm text-gray-900 mt-1">{order.manDays ?? 0} days</p>
              </div>

              <div>
                <label className="text-xs text-gray-500">Total Cost</label>
                <p className="text-sm text-gray-900 mt-1">
                  €{Number(order.totalCost || 0).toLocaleString()}
                </p>
              </div>

              <div>
                <label className="text-xs text-gray-500">Status</label>
                <div className="mt-1">
                  <StatusBadge status={order.status} />
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg text-gray-900 mb-4">Timeline & Location</h2>

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
                  <p className="text-sm text-gray-900">{order.location || "-"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Change Requests */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg text-gray-900 mb-4">Change Requests</h2>

            {changeRequests.length === 0 ? (
              <p className="text-sm text-gray-500">No change requests yet.</p>
            ) : (
              <div className="space-y-3">
                {changeRequests.map((cr) => (
                  <div key={cr.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                            {cr.type}
                          </span>
                          <StatusBadge status={cr.status} />
                          {cr.createdBySystem && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                              Group 3
                            </span>
                          )}
                        </div>

                        {cr.reason && <p className="text-sm text-gray-700 mt-2">{cr.reason}</p>}

                        {cr.type === "Extension" && (
                          <div className="mt-2 text-xs text-gray-600">
                            <div>
                              New End Date:{" "}
                              <span className="text-gray-900">{cr.newEndDate || "-"}</span>
                            </div>
                            <div>
                              Additional Man Days:{" "}
                              <span className="text-gray-900">{cr.additionalManDays ?? "-"}</span>
                            </div>
                            {cr.newTotalCost && (
                              <div>
                                New Total Cost:{" "}
                                <span className="text-gray-900">
                                  €{Number(cr.newTotalCost).toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {cr.type === "Substitution" && (
                          <div className="mt-2 text-xs text-gray-600">
                            <div>
                              Old Specialist:{" "}
                              <span className="text-gray-900">{cr.oldSpecialistId || "-"}</span>
                            </div>
                            <div>
                              New Specialist:{" "}
                              <span className="text-gray-900">{cr.newSpecialistId || "-"}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock size={12} />
                        {new Date(cr.created_at).toLocaleString()}
                      </div>
                    </div>

                    {canProviderAct && cr.status === "Requested" && (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => handleDecision(cr.id, "Approve")}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleDecision(cr.id, "Decline")}
                          className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Substitution request */}
          {order.status === "ACTIVE" && canProviderAct && (
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
                      value={newSpecialistId}
                      onChange={(e) => setNewSpecialistId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">Select specialist...</option>
                      {specialists.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.availability})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Reason</label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      rows={3}
                      placeholder="Explain the reason for substitution..."
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSubstitutionRequest}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                    >
                      Submit
                    </button>
                    <button
                      onClick={() => setShowSubstitutionForm(false)}
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
          {order.status === "ACTIVE" && (
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> Extensions are initiated by the Project Manager (Group 3) externally via API.
                When requested, you can approve or decline here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceOrderDetail;
