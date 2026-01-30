// frontend/src/pages/ServiceOrderDetail.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, Clock, Users2 } from "lucide-react";
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

// We will create Extension by POSTing to the same endpoint used for substitutions,
// because backend ServiceOrderChangeRequestCreateSerializer already supports Extension
import { authFetch } from "../api/http";

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

    daily_rate?: string;
    travelling_cost?: string;
    specialist_cost?: string;
  }>;
};

function firstAssignment(order: ServiceOrderDetailModel) {
  const a = order.assignments || [];
  return a.length ? a[0] : null;
}

function fmtEUR(v: any) {
  const n = Number(v || 0);
  if (Number.isNaN(n)) return "€0";
  return `€${n.toLocaleString()}`;
}

function toISODate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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

  // Outbound substitution
  const [showSubstitutionForm, setShowSubstitutionForm] = useState(false);
  const [newSpecialistId, setNewSpecialistId] = useState("");
  const [reason, setReason] = useState("");

  // Outbound extension
  const [showExtensionForm, setShowExtensionForm] = useState(false);
  const [newEndDate, setNewEndDate] = useState<string>(() => toISODate(new Date()));
  const [additionalManDays, setAdditionalManDays] = useState<number>(0);
  const [extensionReason, setExtensionReason] = useState("");

  // Inbound substitution approval: per-CR chosen replacement
  const [inboundReplacementByCrId, setInboundReplacementByCrId] = useState<Record<number, string>>({});
  const [inboundNoteByCrId, setInboundNoteByCrId] = useState<Record<number, string>>({});

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
      const o = (await getServiceOrderById(access, Number(id))) as unknown as ServiceOrderDetailModel;
      setOrder(o);

      const crAll = await listChangeRequests(access);
      const cr = crAll.filter((x) => x.serviceOrderId === Number(id));
      setChangeRequests(cr);

      if (canProviderAct) {
        const sp = await getSpecialists(access);

        const currentAssignedIds = new Set((o.assignments || []).map((a) => String(a.specialistId)));
        const filtered = (sp as any[]).filter(
          (s: any) =>
            s.providerId === currentProvider?.id &&
            !currentAssignedIds.has(String(s.id)) &&
            String(s.availability || "") !== "Fully Booked"
        );

        setSpecialists(filtered);
      } else {
        setSpecialists([]);
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
  }, [access, id, canProviderAct]);

  const handleDecision = async (cr: ServiceOrderChangeRequest, decision: "Approve" | "Decline") => {
    try {
      if (!access) throw new Error("Not authenticated");

      // If inbound substitution + approve -> must have replacement specialist
      const needsReplacement = cr.type === "Substitution" && cr.createdBySystem && decision === "Approve";
      const pickedReplacement = inboundReplacementByCrId[cr.id] || "";
      const note = inboundNoteByCrId[cr.id] || "";

      if (needsReplacement && !pickedReplacement) {
        return alert("Select a replacement specialist to approve this inbound substitution.");
      }

      await decideChangeRequest(access, cr.id, {
        decision,
        providerResponseNote: note,
        ...(needsReplacement ? { newSpecialistId: pickedReplacement } : {}),
      } as any);

      // cleanup UI state for that CR
      setInboundReplacementByCrId((prev) => {
        const copy = { ...prev };
        delete copy[cr.id];
        return copy;
      });
      setInboundNoteByCrId((prev) => {
        const copy = { ...prev };
        delete copy[cr.id];
        return copy;
      });

      await refreshAll();
    } catch (e: any) {
      alert(e?.message || "Failed to update request");
    }
  };

  const handleOutboundSubstitutionRequest = async () => {
    try {
      if (!access) throw new Error("Not authenticated");
      if (!order) throw new Error("Order not loaded");
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

  const handleOutboundExtensionRequest = async () => {
    try {
      if (!access) throw new Error("Not authenticated");
      if (!order) throw new Error("Order not loaded");

      if (!newEndDate) return alert("Select a new end date");
      if (!additionalManDays || additionalManDays <= 0) return alert("Additional man-days must be > 0");

      // Backend create serializer supports Extension if newEndDate is present
      const res = await authFetch("/api/service-order-change-requests/", access, {
        method: "POST",
        body: JSON.stringify({
          serviceOrderId: order.id,
          type: "Extension",
          newEndDate,
          additionalManDays,
          // newTotalCost optional; PMS calculates internally; omit for now
          reason: extensionReason,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || `Failed to request extension (${res.status})`);

      setShowExtensionForm(false);
      setAdditionalManDays(0);
      setExtensionReason("");
      await refreshAll();
    } catch (e: any) {
      alert(e?.message || "Failed to request extension");
    }
  };

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
          <button onClick={() => navigate("/service-orders")} className="mt-4 text-blue-600 hover:text-blue-700">
            Back to Service Orders
          </button>
        </div>
      </div>
    );
  }

  const first = firstAssignment(order);
  const assignedLabel = first
    ? `${first.specialistName || first.specialistId}${first.materialNumber ? ` • ${first.materialNumber}` : ""}`
    : "-";

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
                <label className="text-xs text-gray-500">Assigned Specialist</label>
                <p className="text-sm text-gray-900 mt-1">{assignedLabel}</p>
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
                <p className="text-sm text-gray-900 mt-1">{fmtEUR(order.totalCost || 0)}</p>
              </div>

              <div>
                <label className="text-xs text-gray-500">Status</label>
                <div className="mt-1">
                  <StatusBadge status={order.status} />
                </div>
              </div>
            </div>
          </div>

          {/* Assignments */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users2 size={18} className="text-gray-500" />
              <h2 className="text-lg text-gray-900">Assignments</h2>
            </div>

            {(!order.assignments || order.assignments.length === 0) ? (
              <p className="text-sm text-gray-500">No assignments found.</p>
            ) : (
              <div className="space-y-3">
                {order.assignments.map((a) => (
                  <div key={a.specialistId} className="border border-gray-200 rounded-lg p-4">
                    <div className="text-sm text-gray-900">
                      <strong>{a.specialistName || a.specialistId}</strong>
                      {a.materialNumber ? <span className="text-gray-500"> • {a.materialNumber}</span> : null}
                    </div>
                    <div className="text-xs text-gray-600 mt-2 grid grid-cols-3 gap-2">
                      <div>Daily rate: {a.daily_rate ?? "-"}</div>
                      <div>Travel: {a.travelling_cost ?? "-"}</div>
                      <div>Cost: {a.specialist_cost ?? "-"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                {changeRequests.map((cr) => {
                  const isInbound = !!cr.createdBySystem;
                  const isPending = cr.status === "Requested";
                  const needsReplacementOnApprove = isInbound && cr.type === "Substitution";

                  const inboundReplacement = inboundReplacementByCrId[cr.id] || "";
                  const inboundNote = inboundNoteByCrId[cr.id] || "";

                  return (
                    <div key={cr.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="w-full">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                              {cr.type}
                            </span>
                            <StatusBadge status={cr.status} />
                            {isInbound && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                Group 3
                              </span>
                            )}
                            {!isInbound && (
                              <span className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs">
                                PMS
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
                                  <span className="text-gray-900">{fmtEUR(cr.newTotalCost)}</span>
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

                              {cr.substitutionDate && (
                                <div>
                                  Substitution Date:{" "}
                                  <span className="text-gray-900">{cr.substitutionDate}</span>
                                </div>
                              )}
                            </div>
                          )}
                          {/* Inbound substitution approval needs selection */}
                          {canProviderAct && isPending && needsReplacementOnApprove && (
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-gray-500 block mb-1">
                                  Replacement Specialist (required to approve)
                                </label>
                                <select
                                  value={inboundReplacement}
                                  onChange={(e) =>
                                    setInboundReplacementByCrId((prev) => ({ ...prev, [cr.id]: e.target.value }))
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                >
                                  <option value="">Select specialist...</option>
                                  {specialists.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.name} ({(s as any).availability || "Available"})
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="text-xs text-gray-500 block mb-1">Provider Note (optional)</label>
                                <input
                                  value={inboundNote}
                                  onChange={(e) =>
                                    setInboundNoteByCrId((prev) => ({ ...prev, [cr.id]: e.target.value }))
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                  placeholder="e.g., approved and reassigned"
                                />
                              </div>
                            </div>
                          )}

                          {/* Inbound extension can optionally include a note */}
                          {canProviderAct && isPending && isInbound && cr.type === "Extension" && (
                            <div className="mt-4">
                              <label className="text-xs text-gray-500 block mb-1">Provider Note (optional)</label>
                              <input
                                value={inboundNote}
                                onChange={(e) =>
                                  setInboundNoteByCrId((prev) => ({ ...prev, [cr.id]: e.target.value }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                placeholder="e.g., approved extension"
                              />
                            </div>
                          )}

                          {canProviderAct && isPending && (
                            <div className="mt-4 flex gap-2">
                              <button
                                onClick={() => handleDecision(cr, "Approve")}
                                className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleDecision(cr, "Decline")}
                                className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
                              >
                                Decline
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-xs text-gray-500 ml-4">
                          <Clock size={12} />
                          {new Date(cr.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Actions */}
          {order.status === "ACTIVE" && canProviderAct && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-sm text-gray-900 mb-4">Actions</h2>

              {/* Outbound Substitution */}
              {!showSubstitutionForm ? (
                <button
                  onClick={() => {
                    setShowSubstitutionForm(true);
                    setShowExtensionForm(false);
                  }}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Request Substitution
                </button>
              ) : (
                <div className="space-y-3 mb-4">
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
                          {s.name} ({(s as any).availability || "Available"})
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
                      onClick={handleOutboundSubstitutionRequest}
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

              {/* Outbound Extension */}
              {!showExtensionForm ? (
                <button
                  onClick={() => {
                    setShowExtensionForm(true);
                    setShowSubstitutionForm(false);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-800 rounded-lg hover:bg-gray-50 mt-3"
                >
                  Request Extension
                </button>
              ) : (
                <div className="space-y-3 mt-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">New End Date</label>
                    <input
                      type="date"
                      value={newEndDate}
                      onChange={(e) => setNewEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Additional Man-Days</label>
                    <input
                      type="number"
                      value={additionalManDays}
                      onChange={(e) => setAdditionalManDays(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      min={0}
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Reason</label>
                    <textarea
                      value={extensionReason}
                      onChange={(e) => setExtensionReason(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      rows={3}
                      placeholder="Explain the reason for extension..."
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleOutboundExtensionRequest}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                    >
                      Submit
                    </button>
                    <button
                      onClick={() => setShowExtensionForm(false)}
                      className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Info note */}
          {order.status === "ACTIVE" && (
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> Change requests can be created by PMS or Group 3.
                Inbound requests (Group 3) must be approved/declined here. Inbound substitution approvals require selecting a replacement specialist.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceOrderDetail;
