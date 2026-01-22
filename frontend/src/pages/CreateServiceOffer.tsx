// src/pages/CreateServiceOffer.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  Users,
  Plus,
  CheckCircle2,
} from "lucide-react";

import { StatusBadge } from "../components/StatusBadge";
import { useApp } from "../context/AppContext";

import type { ServiceRequest, Group3RoleRequirement, Specialist } from "../types";
import { getServiceRequestById, getSuggestedSpecialists } from "../api/serviceRequests";
import { createServiceOffer } from "../api/serviceOffers";

type SelectedLine = {
  specialistId: string;
  specialistName: string;
  materialNumber: string;
  roleIndex: number; // maps to request.roles[index]
  dailyRate: number;
  travellingCost: number;
  contractualRelationship: "Employee" | "Freelancer" | "Subcontractor";
  subcontractorCompany?: string;

  matchMustHaveCriteria: boolean;
  matchNiceToHaveCriteria: boolean;
  matchLanguageSkills: boolean;
};

function safeArray<T>(v: T[] | null | undefined): T[] {
  return Array.isArray(v) ? v : [];
}

function isExpired(iso?: string | null) {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
}

function srIsBiddable(sr: any): { ok: boolean; reason?: string } {
  const status = String(sr?.status || "").toUpperCase();
  const active = sr?.biddingActive;
  const end = sr?.biddingEndAt;

  if (!active) return { ok: false, reason: "Bidding is not active for this request." };
  if (end && isExpired(end)) return { ok: false, reason: "Bidding deadline has passed." };

  // Group3 sample uses APPROVED_FOR_BIDDING
  if (status && status !== "APPROVED_FOR_BIDDING") {
    return { ok: false, reason: `Request is not approved for bidding (status: ${sr?.status}).` };
  }
  return { ok: true };
}

function defaultRoleIndexForAdd(request: ServiceRequest, selected: SelectedLine[]) {
  const roles = safeArray(request.roles);
  if (!roles.length) return 0;

  if (request.type === "SINGLE") return 0;
  if (request.type === "MULTI") return 0;

  // TEAM: try to fill first missing role
  const used = new Set(selected.map((s) => s.roleIndex));
  for (let i = 0; i < roles.length; i++) {
    if (!used.has(i)) return i;
  }
  return 0;
}

export const CreateServiceOffer: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { tokens, currentProvider, currentUser } = useApp();

  const requestId = searchParams.get("requestId") || "";
  const access = tokens?.access || "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [request, setRequest] = useState<ServiceRequest | null>(null);

  const [recommended, setRecommended] = useState<Specialist[]>([]);
  const [eligibleCount, setEligibleCount] = useState<number>(0);

  const [showEligible, setShowEligible] = useState(false);
  const [eligible, setEligible] = useState<Specialist[]>([]);

  const [selected, setSelected] = useState<SelectedLine[]>([]);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const roles: Group3RoleRequirement[] = useMemo(() => safeArray(request?.roles), [request?.roles]);

  const biddable = useMemo(() => (request ? srIsBiddable(request) : { ok: false, reason: "Request not loaded" }), [request]);

  const refresh = async () => {
    if (!access || !requestId) return;
    setLoading(true);
    setErr(null);

    try {
      const sr = await getServiceRequestById(access, requestId);
      setRequest(sr);

      const rec = await getSuggestedSpecialists(access, requestId, { mode: "recommended", limit: 10 });
      setRecommended(rec.specialists as any);
      setEligibleCount(rec.eligibleCount);

      setShowEligible(false);
      setEligible([]);
      setSelected([]);
      setSubmitError(null);
    } catch (e: any) {
      setErr(e?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access, requestId]);

  const fetchEligible = async () => {
    if (!access || !requestId) return;
    const res = await getSuggestedSpecialists(access, requestId, { mode: "eligible", limit: 1000 });
    setEligible(res.specialists as any);
    setShowEligible(true);
  };

  const addSpecialist = (s: Specialist) => {
    if (!request) return;

    // SINGLE: only 1
    if (request.type === "SINGLE" && selected.length >= 1) return;

    // avoid duplicate
    if (selected.some((x) => x.specialistId === s.id)) return;

    const roleIndex = defaultRoleIndexForAdd(request, selected);

    const line: SelectedLine = {
      specialistId: s.id,
      specialistName: s.name,
      materialNumber: s.materialNumber || "",
      roleIndex,
      dailyRate: Number(s.averageDailyRate || 0),
      travellingCost: 50,
      contractualRelationship: "Employee",
      subcontractorCompany: "",
      matchMustHaveCriteria: true,
      matchNiceToHaveCriteria: true,
      matchLanguageSkills: true,
    };

    const next = [...selected, line];

    // MULTI: enforce all same roleIndex
    if (request.type === "MULTI") {
      const fixedRole = next[0]?.roleIndex ?? 0;
      next.forEach((n) => (n.roleIndex = fixedRole));
    }

    setSelected(next);
  };

  const removeSpecialist = (id: string) => {
    setSelected((prev) => prev.filter((x) => x.specialistId !== id));
  };

  const updateLine = (id: string, patch: Partial<SelectedLine>) => {
    setSelected((prev) =>
      prev.map((x) => (x.specialistId === id ? { ...x, ...patch } : x))
    );
  };

  const totalCost = useMemo(() => {
    if (!request) return 0;
    const rs = roles;
    if (!rs.length) return 0;

    return selected.reduce((sum, line) => {
      const r = rs[line.roleIndex] || rs[0];
      const manDays = Number((r as any).manDays ?? 0);
      const onsiteDays = Number((r as any).onsiteDays ?? 0);
      const part = Number(line.dailyRate || 0) * manDays + Number(line.travellingCost || 0) * onsiteDays;
      return sum + part;
    }, 0);
  }, [selected, roles, request]);

  const validate = (): { ok: boolean; msg?: string } => {
    if (!request) return { ok: false, msg: "Request not loaded" };
    if (!biddable.ok) return { ok: false, msg: biddable.reason || "Not biddable" };

    if (request.type === "SINGLE") {
      if (selected.length !== 1) return { ok: false, msg: "SINGLE request requires exactly 1 specialist." };
    }
    if (request.type === "MULTI") {
      if (selected.length < 1) return { ok: false, msg: "MULTI request requires at least 1 specialist." };
      const roleIdx = selected[0].roleIndex;
      if (selected.some((x) => x.roleIndex !== roleIdx)) return { ok: false, msg: "MULTI request: all selected specialists must be the same role." };
    }
    if (request.type === "TEAM") {
      if (selected.length < 1) return { ok: false, msg: "TEAM request requires selecting specialists for roles." };
      // Soft rule: try to cover each role at least once if roles exist
      if (roles.length > 0) {
        const covered = new Set(selected.map((x) => x.roleIndex));
        if (covered.size < Math.min(roles.length, covered.size + (roles.length - covered.size))) {
          // do not hard block; just allow
        }
      }
    }

    for (const line of selected) {
      if (!line.dailyRate || line.dailyRate <= 0) return { ok: false, msg: "Daily rate must be > 0 for all selected specialists." };
      if (line.contractualRelationship === "Subcontractor" && !String(line.subcontractorCompany || "").trim()) {
        return { ok: false, msg: "Subcontractor company is required when contractual relationship is Subcontractor." };
      }
    }

    return { ok: true };
  };

  const handleSubmit = async (asDraft: boolean) => {
    setSubmitError(null);
    const v = validate();
    if (!v.ok) {
      setSubmitError(v.msg || "Invalid input");
      return;
    }

    if (!access || !request) {
      setSubmitError("Not authenticated");
      return;
    }

    try {
      setSubmitting(true);

      await createServiceOffer(access, {
        serviceRequestId: request.id,
        offerStatus: asDraft ? "DRAFT" : "SUBMITTED",
        supplierName: currentProvider?.name || "",
        supplierRepresentative: currentUser?.name || "",
        contractualRelationship: selected[0]?.contractualRelationship || "",
        subcontractorCompany: selected[0]?.subcontractorCompany || "",
        specialists: selected.map((line) => ({
          userId: line.specialistId,
          dailyRate: Number(line.dailyRate || 0),
          travellingCost: Number(line.travellingCost || 0),
          matchMustHaveCriteria: !!line.matchMustHaveCriteria,
          matchNiceToHaveCriteria: !!line.matchNiceToHaveCriteria,
          matchLanguageSkills: !!line.matchLanguageSkills,
        })),
      });

      navigate("/service-offers");
    } catch (e: any) {
      setSubmitError(e?.message || "Failed to create offer");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-gray-600">Loading...</div>;

  if (err || !request) {
    return (
      <div className="p-8">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <p className="text-gray-700">{err || "Service Request not found"}</p>
          <button onClick={() => navigate("/service-requests")} className="mt-4 text-blue-600 hover:text-blue-700">
            Back to Service Requests
          </button>
        </div>
      </div>
    );
  }

  const canSaveDraft = selected.length > 0 && biddable.ok && !submitting;
  const canSubmit = selected.length > 0 && biddable.ok && !submitting;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(`/service-requests/${requestId}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Service Request
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl text-gray-900">Create Service Offer</h1>
            <p className="text-gray-500 mt-1">
              Respond to: <span className="font-mono">{request.id}</span> • Type: <strong>{request.type}</strong>
            </p>
          </div>

          <button
            onClick={refresh}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            title="Refresh request + suggestions"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Block banner */}
      {!biddable.ok && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 mt-0.5" />
            <div>
              <div className="text-sm text-red-900 font-medium">Offer creation blocked</div>
              <div className="text-sm text-red-700 mt-1">{biddable.reason}</div>
            </div>
          </div>
        </div>
      )}

      {submitError && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-yellow-700 mt-0.5" />
            <div>
              <div className="text-sm text-yellow-900 font-medium">Cannot create offer</div>
              <div className="text-sm text-yellow-800 mt-1">{submitError}</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left */}
        <div className="lg:col-span-2 space-y-6">
          {/* SR Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg text-gray-900">{request.title}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Contract: <span className="font-mono">{request.contractId}</span>
                </p>
              </div>
              <StatusBadge status={request.status} />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <label className="text-xs text-gray-500">Bidding End</label>
                <p className="text-gray-900 mt-1">{request.biddingEndAt || "-"}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Languages</label>
                <p className="text-gray-900 mt-1">{(request.requiredLanguages || []).join(", ") || "-"}</p>
              </div>
            </div>
          </div>

          {/* Roles */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg text-gray-900 mb-4 flex items-center gap-2">
              <Users size={18} className="text-gray-500" />
              Role Requirements
            </h2>

            {roles.length === 0 ? (
              <p className="text-sm text-gray-500">No roles provided by Group 3.</p>
            ) : (
              <div className="space-y-3">
                {roles.map((r, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-sm text-gray-900">
                      <strong>{r.roleName}</strong> • {r.technology} • {r.experienceLevel}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Domain: {r.domain} • ManDays: {r.manDays} • OnsiteDays: {r.onsiteDays}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Suggested Specialists */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg text-gray-900">Suggested Specialists</h2>
              <div className="text-xs text-gray-500">Eligible: {eligibleCount}</div>
            </div>

            {recommended.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <AlertCircle size={24} className="mx-auto text-yellow-600 mb-2" />
                <p className="text-sm text-gray-700">No suggested specialists found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recommended.map((s: any) => {
                  const already = selected.some((x) => x.specialistId === s.id);
                  return (
                    <div key={s.id} className="p-4 border rounded-lg border-gray-200 hover:border-gray-300">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm text-gray-900">{s.name}</div>
                          <div className="text-xs text-gray-500">{s.materialNumber || ""}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {s.experienceLevel || "-"} • {s.technologyLevel || "-"} • €{s.averageDailyRate || "-"}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => addSpecialist(s)}
                          disabled={already || (request.type === "SINGLE" && selected.length >= 1)}
                          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                            already
                              ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                              : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                        >
                          <Plus size={16} />
                          {already ? "Added" : "Add"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4">
              {!showEligible ? (
                <button
                  type="button"
                  onClick={fetchEligible}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Show more eligible specialists →
                </button>
              ) : (
                <div className="mt-3 space-y-2">
                  <div className="text-sm text-gray-700">Eligible specialists (up to 1000):</div>
                  <div className="max-h-72 overflow-auto border border-gray-200 rounded-lg">
                    {eligible.map((s: any) => {
                      const already = selected.some((x) => x.specialistId === s.id);
                      return (
                        <div key={s.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                          <div>
                            <div className="text-sm text-gray-900">{s.name}</div>
                            <div className="text-xs text-gray-500">{s.materialNumber || ""}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => addSpecialist(s)}
                            disabled={already || (request.type === "SINGLE" && selected.length >= 1)}
                            className={`px-3 py-1 rounded text-sm ${
                              already ? "bg-gray-100 text-gray-500" : "bg-blue-600 text-white hover:bg-blue-700"
                            }`}
                          >
                            {already ? "Added" : "Add"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Selected Specialists */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg text-gray-900 mb-4">Selected Specialists</h2>

            {selected.length === 0 ? (
              <p className="text-sm text-gray-500">No specialists selected yet.</p>
            ) : (
              <div className="space-y-4">
                {selected.map((line) => {
                  const r = roles[line.roleIndex] || roles[0];
                  return (
                    <div key={line.specialistId} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm text-gray-900">{line.specialistName}</div>
                          <div className="text-xs text-gray-500">{line.materialNumber}</div>
                          {r && (
                            <div className="text-xs text-gray-600 mt-1">
                              Assigned: <strong>{r.roleName}</strong> • {r.technology} • {r.experienceLevel}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeSpecialist(line.specialistId)}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Role assignment (TEAM only editable) */}
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Role Assignment</label>
                          <select
                            value={line.roleIndex}
                            disabled={request.type !== "TEAM" || roles.length === 0}
                            onChange={(e) => updateLine(line.specialistId, { roleIndex: Number(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            {roles.map((rr, idx) => (
                              <option key={idx} value={idx}>
                                {rr.roleName} • {rr.technology} • {rr.experienceLevel}
                              </option>
                            ))}
                          </select>
                          {request.type === "MULTI" && (
                            <div className="text-xs text-gray-400 mt-1">MULTI: all specialists share the same role</div>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Daily Rate (€)</label>
                          <input
                            type="number"
                            value={line.dailyRate}
                            onChange={(e) => updateLine(line.specialistId, { dailyRate: Number(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Travelling Cost (€ / onsite day)</label>
                          <input
                            type="number"
                            value={line.travellingCost}
                            onChange={(e) => updateLine(line.specialistId, { travellingCost: Number(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={line.matchMustHaveCriteria}
                            onChange={(e) => updateLine(line.specialistId, { matchMustHaveCriteria: e.target.checked })}
                          />
                          <span>Matches Must-Have</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={line.matchNiceToHaveCriteria}
                            onChange={(e) => updateLine(line.specialistId, { matchNiceToHaveCriteria: e.target.checked })}
                          />
                          <span>Matches Nice-to-Have</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={line.matchLanguageSkills}
                            onChange={(e) => updateLine(line.specialistId, { matchLanguageSkills: e.target.checked })}
                          />
                          <span>Matches Language</span>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Contractual Relationship</label>
                          <select
                            value={line.contractualRelationship}
                            onChange={(e) => updateLine(line.specialistId, { contractualRelationship: e.target.value as any })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="Employee">Employee</option>
                            <option value="Freelancer">Freelancer</option>
                            <option value="Subcontractor">Subcontractor</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Subcontractor Company</label>
                          <input
                            type="text"
                            value={line.subcontractorCompany || ""}
                            onChange={(e) => updateLine(line.specialistId, { subcontractorCompany: e.target.value })}
                            disabled={line.contractualRelationship !== "Subcontractor"}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            placeholder={line.contractualRelationship === "Subcontractor" ? "Enter company name" : "N/A"}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="space-y-6">
          {/* Total cost */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-sm text-gray-900 mb-4">Cost Summary</h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Selected specialists</span>
                <span className="text-gray-900">{selected.length}</span>
              </div>

              <div className="border-t border-gray-200 pt-3 flex justify-between">
                <span className="text-gray-900">Total Cost (Request)</span>
                <span className="text-gray-900">€{Number(totalCost).toLocaleString()}</span>
              </div>

              <div className="mt-3 text-xs text-gray-500 flex items-start gap-2">
                <CheckCircle2 size={14} className="text-green-600 mt-0.5" />
                One total cost is stored for the whole request (not per specialist).
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-sm text-gray-900 mb-4">Actions</h2>

            <div className="space-y-3">
              <button
                onClick={() => handleSubmit(false)}
                disabled={!canSubmit}
                className={`w-full px-4 py-3 rounded-lg transition-colors ${
                  canSubmit ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                {submitting ? "Submitting..." : "Submit Offer"}
              </button>

              <button
                onClick={() => handleSubmit(true)}
                disabled={!canSaveDraft}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                  canSaveDraft ? "border-gray-300 text-gray-700 hover:bg-gray-50" : "border-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                {submitting ? "Saving..." : "Save as Draft"}
              </button>

              <button
                onClick={() => navigate("/service-requests")}
                className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-4">
              <strong>Note:</strong> SUBMITTED offers will be sent to Group-3 via PUT and later accepted/rejected.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateServiceOffer;
