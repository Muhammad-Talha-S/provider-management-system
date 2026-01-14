import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  CheckCircle,
  Star,
  Languages,
  AlertCircle,
  FileText,
  Clock,
  RefreshCw,
} from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import { useApp } from "../context/AppContext";

import type { ServiceRequest, Specialist } from "../types";
import { getServiceRequestById } from "../api/serviceRequests";
import { getSpecialists } from "../api/specialists";
import { createServiceOffer } from "../api/serviceOffers";

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

function normalizeApiErrorMessage(e: any): string {
  // DRF errors commonly come as {detail: "..."} or field errors
  const msg = e?.message || "";

  // Friendly mapping for your milestone rules
  const lower = msg.toLowerCase();
  if (lower.includes("deadline") && (lower.includes("passed") || lower.includes("expired"))) {
    return "Offer deadline has passed. You can no longer submit offers for this request.";
  }
  if (lower.includes("not allowed") && lower.includes("award")) {
    return "Your provider is not eligible for this request (contract not awarded to your provider).";
  }
  if (lower.includes("not allowed") && (lower.includes("type") || lower.includes("request type"))) {
    return "This request type is not allowed by the contract configuration.";
  }
  if (lower.includes("closed")) {
    return "This service request is closed and no longer accepting offers.";
  }

  return msg || "Failed to create offer";
}

export const CreateServiceOffer: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentProvider, tokens } = useApp();

  const requestId = searchParams.get("requestId") || "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);

  const [selectedSpecialistId, setSelectedSpecialistId] = useState<string>("");
  const [dailyRate, setDailyRate] = useState<string>("");
  const [travelCost, setTravelCost] = useState<string>("50");
  const [contractualRelationship, setContractualRelationship] =
    useState<"Employee" | "Freelancer" | "Subcontractor">("Employee");
  const [subcontractorCompany, setSubcontractorCompany] = useState<string>("");
  const [mustHaveMatch, setMustHaveMatch] = useState<string>("");
  const [niceToHaveMatch, setNiceToHaveMatch] = useState<string>("");

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const access = tokens?.access || "";

  const deadlineInfo = useMemo(() => getCountdown(request?.offerDeadlineAt), [request?.offerDeadlineAt]);
  const isOpen = request?.status === "Open";
  const isDeadlineExpired = deadlineInfo.isExpired;

  const hardBlockedReason = useMemo(() => {
    if (!request) return null;
    if (!isOpen) return "This service request is closed and no longer accepting offers.";
    if (isDeadlineExpired) return "Offer deadline has passed. You can no longer submit offers for this request.";
    return null;
  }, [request, isOpen, isDeadlineExpired]);

  const refresh = async () => {
    if (!access || !requestId) return;
    setLoading(true);
    setErr(null);
    try {
      const sr = await getServiceRequestById(access, requestId);
      setRequest(sr);

      const sp = await getSpecialists(access);
      // keep only current provider specialists + not fully booked
      const filtered = sp.filter(
        (s: any) =>
          s.providerId === currentProvider?.id &&
          (s.availability || "") !== "Fully Booked"
      );
      setSpecialists(filtered);
    } catch (e: any) {
      setErr(e?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access, requestId, currentProvider?.id]);

  const selectedSpecialist = useMemo(
    () => specialists.find((s) => s.id === selectedSpecialistId),
    [specialists, selectedSpecialistId]
  );

  const totalCost = useMemo(() => {
    if (!request) return 0;
    const rate = parseFloat(dailyRate || "0") || 0;
    const travel = parseFloat(travelCost || "0") || 0;
    return rate * (request.totalManDays || 0) + travel * (request.onsiteDays || 0);
  }, [dailyRate, travelCost, request]);

  const checkBasicValidity = () => {
    if (!request) return { ok: false, msg: "Request missing" };
    if (hardBlockedReason) return { ok: false, msg: hardBlockedReason };

    if (!selectedSpecialistId) return { ok: false, msg: "Select a specialist" };
    if (!dailyRate) return { ok: false, msg: "Enter daily rate" };
    if (contractualRelationship === "Subcontractor" && !subcontractorCompany.trim())
      return { ok: false, msg: "Subcontractor company is required" };

    // Optional: validate percentages in range (when provided)
    const mh = mustHaveMatch ? Number(mustHaveMatch) : null;
    const nh = niceToHaveMatch ? Number(niceToHaveMatch) : null;
    if (mh != null && (mh < 0 || mh > 100)) return { ok: false, msg: "Must-Have Match must be between 0 and 100" };
    if (nh != null && (nh < 0 || nh > 100)) return { ok: false, msg: "Nice-to-Have Match must be between 0 and 100" };

    return { ok: true, msg: "" };
  };

  const handleSubmit = async (asDraft: boolean) => {
    setSubmitError(null);

    const v = checkBasicValidity();
    if (!v.ok) {
      setSubmitError(v.msg);
      return;
    }

    if (!asDraft && (!mustHaveMatch || !niceToHaveMatch)) {
      setSubmitError("For submission, please fill Must-Have Match and Nice-to-Have Match (%)");
      return;
    }

    try {
      if (!access || !request) throw new Error("Not authenticated");

      setSubmitting(true);

      await createServiceOffer(access, {
        serviceRequestId: request.id,
        specialistId: selectedSpecialistId,
        daily_rate: parseFloat(dailyRate),
        travelCostPerOnsiteDay: parseFloat(travelCost || "0") || 0,
        total_cost: totalCost,
        contractualRelationship,
        subcontractorCompany: contractualRelationship === "Subcontractor" ? subcontractorCompany : null,
        mustHaveMatchPercentage: asDraft ? null : parseInt(mustHaveMatch, 10),
        niceToHaveMatchPercentage: asDraft ? null : parseInt(niceToHaveMatch, 10),
        status: asDraft ? "Draft" : "Submitted",
      });

      navigate("/service-offers");
    } catch (e: any) {
      setSubmitError(normalizeApiErrorMessage(e));
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

  const canSubmitOffer =
    !!selectedSpecialistId &&
    !!dailyRate &&
    !!mustHaveMatch &&
    !!niceToHaveMatch &&
    !hardBlockedReason &&
    !submitting;

  const canSaveDraft =
    !!selectedSpecialistId &&
    !!dailyRate &&
    !hardBlockedReason &&
    !submitting;

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
            <p className="text-gray-500 mt-1">Respond to Service Request: {request.id}</p>
          </div>

          <button
            onClick={refresh}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            title="Refresh request rules/deadline"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Blocking banner (Milestone 5 UX) */}
      {hardBlockedReason && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 mt-0.5" />
            <div>
              <div className="text-sm text-red-900 font-medium">Offer creation blocked</div>
              <div className="text-sm text-red-700 mt-1">{hardBlockedReason}</div>
            </div>
          </div>
        </div>
      )}

      {/* API submit error banner */}
      {submitError && !hardBlockedReason && (
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
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Request Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg text-gray-900">{request.title}</h2>
                <p className="text-sm text-gray-500 mt-1">{request.id}</p>
              </div>
              <StatusBadge status={request.status} />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <label className="text-xs text-gray-500">Role</label>
                <p className="text-gray-900 mt-1">{request.role}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Technology</label>
                <p className="text-gray-900 mt-1">{request.technology}</p>
              </div>

              <div>
                <label className="text-xs text-gray-500">Offer Deadline</label>
                <div className="mt-1">
                  <div className="text-sm text-gray-900">{formatDeadline(request.offerDeadlineAt)}</div>
                  <div className={`text-xs mt-1 inline-flex items-center gap-1 ${deadlineInfo.isExpired ? "text-red-600" : "text-gray-500"}`}>
                    <Clock size={12} className={deadlineInfo.isExpired ? "text-red-500" : "text-gray-400"} />
                    {deadlineInfo.label}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500">Cycles</label>
                <p className="text-gray-900 mt-1">{request.cycles ?? "-"}</p>
              </div>

              <div>
                <label className="text-xs text-gray-500">Experience Level</label>
                <p className="text-gray-900 mt-1">{request.experienceLevel}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Total Man-Days</label>
                <p className="text-gray-900 mt-1">{request.totalManDays} days</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Duration</label>
                <div className="flex items-center gap-1 mt-1">
                  <Calendar size={14} className="text-gray-400" />
                  <p className="text-gray-900">
                    {request.startDate || "-"} - {request.endDate || "-"}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">Location</label>
                <div className="flex items-center gap-1 mt-1">
                  <MapPin size={14} className="text-gray-400" />
                  <p className="text-gray-900">{request.performanceLocation}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Requirements */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg text-gray-900 mb-4">Requirements</h2>

            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={16} className="text-red-500" />
                <h3 className="text-sm text-gray-900">Must-Have Criteria</h3>
              </div>
              <div className="space-y-2">
                {(request.mustHaveCriteria || []).map((c: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-red-50 rounded text-xs">
                    <span className="text-gray-900">{c.name}</span>
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded">{c.weight}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Star size={16} className="text-blue-500" />
                <h3 className="text-sm text-gray-900">Nice-to-Have Criteria</h3>
              </div>
              <div className="space-y-2">
                {(request.niceToHaveCriteria || []).map((c: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-blue-50 rounded text-xs">
                    <span className="text-gray-900">{c.name}</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">{c.weight}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Languages */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-3">
              <Languages size={16} className="text-gray-400" />
              <h2 className="text-sm text-gray-900">Language Requirements</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {(request.requiredLanguages || []).map((lang: string, idx: number) => (
                <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-900 rounded text-sm">
                  {lang}
                </span>
              ))}
            </div>
          </div>

          {/* Specialist selection */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg text-gray-900 mb-4">Select Specialist</h2>

            {specialists.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <AlertCircle size={24} className="mx-auto text-yellow-600 mb-2" />
                <p className="text-sm text-gray-700">No available specialists in your organization</p>
              </div>
            ) : (
              <div className="space-y-3">
                {specialists.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSelectedSpecialistId(s.id);
                      setDailyRate(s.averageDailyRate?.toString() || "");
                    }}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedSpecialistId === s.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm text-gray-900">{s.name}</p>
                          <p className="text-xs text-gray-500">{s.materialNumber}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            s.availability === "Available" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {s.availability}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-gray-500">Experience</span>
                        <p className="text-gray-900">{s.experienceLevel}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Technology</span>
                        <p className="text-gray-900">{s.technologyLevel}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Rate</span>
                        <p className="text-gray-900">€{s.averageDailyRate}/day</p>
                      </div>
                    </div>

                    <div className="mt-2">
                      <span className="text-xs text-gray-500">Skills: </span>
                      <span className="text-xs text-gray-900">{(s.skills || []).join(", ")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Offer form */}
          {selectedSpecialistId && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg text-gray-900 mb-4">Offer Details</h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Daily Rate (€) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={dailyRate}
                      onChange={(e) => setDailyRate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Enter daily rate"
                      disabled={!!hardBlockedReason}
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Travel Cost per Onsite Day (€)</label>
                    <input
                      type="number"
                      value={travelCost}
                      onChange={(e) => setTravelCost(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Enter travel cost"
                      disabled={!!hardBlockedReason}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-2">
                    Contractual Relationship <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={contractualRelationship}
                    onChange={(e) => setContractualRelationship(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    disabled={!!hardBlockedReason}
                  >
                    <option value="Employee">Employee</option>
                    <option value="Freelancer">Freelancer</option>
                    <option value="Subcontractor">Subcontractor</option>
                  </select>
                </div>

                {contractualRelationship === "Subcontractor" && (
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Subcontractor Company <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={subcontractorCompany}
                      onChange={(e) => setSubcontractorCompany(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Enter company name"
                      disabled={!!hardBlockedReason}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Must-Have Match (%) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={mustHaveMatch}
                      onChange={(e) => setMustHaveMatch(e.target.value)}
                      min="0"
                      max="100"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="0-100"
                      disabled={!!hardBlockedReason}
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Nice-to-Have Match (%) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={niceToHaveMatch}
                      onChange={(e) => setNiceToHaveMatch(e.target.value)}
                      min="0"
                      max="100"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="0-100"
                      disabled={!!hardBlockedReason}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Linked contract quick block */}
          {!!request.linkedContractId && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText size={18} className="text-gray-400" />
                <h2 className="text-sm text-gray-900">Linked Contract</h2>
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <label className="text-xs text-gray-500">Contract ID</label>
                  <p className="text-gray-900 mt-1">{request.linkedContractId}</p>
                </div>
                <Link to={`/contracts/${request.linkedContractId}`} className="block text-sm text-blue-600 hover:text-blue-700 mt-2">
                  View Contract Details →
                </Link>
              </div>
            </div>
          )}

          {/* Cost summary */}
          {selectedSpecialistId && dailyRate && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-sm text-gray-900 mb-4">Cost Summary</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Daily Rate</span>
                  <span className="text-gray-900">€{dailyRate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Man-Days</span>
                  <span className="text-gray-900">{request.totalManDays}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="text-gray-900">
                    €{(parseFloat(dailyRate || "0") * request.totalManDays).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Onsite Days</span>
                  <span className="text-gray-900">{request.onsiteDays}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Travel Cost</span>
                  <span className="text-gray-900">
                    €{((parseFloat(travelCost || "0") || 0) * request.onsiteDays).toLocaleString()}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex justify-between">
                  <span className="text-gray-900">Total Cost</span>
                  <span className="text-gray-900">€{totalCost.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-sm text-gray-900 mb-4">Actions</h2>

            <div className="space-y-3">
              <button
                onClick={() => handleSubmit(false)}
                disabled={!canSubmitOffer}
                className={`w-full px-4 py-3 rounded-lg transition-colors ${
                  canSubmitOffer ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-300 text-gray-500 cursor-not-allowed"
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
              <strong>Note:</strong> Submitted offers will be evaluated by Group 3.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateServiceOffer;
