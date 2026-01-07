import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, CheckCircle, Star, Languages, AlertCircle, FileText } from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import { useApp } from "../context/AppContext";

import type { ServiceRequest, Specialist } from "../types";
import { getServiceRequestById } from "../api/serviceRequests";
import { getSpecialists } from "../api/specialists";
import { createServiceOffer } from "../api/serviceOffers";

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

  const access = tokens?.access || "";

  useEffect(() => {
    const run = async () => {
      if (!access || !requestId) {
        setErr("Missing session or requestId");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErr(null);

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

    run();
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
    if (!selectedSpecialistId) return { ok: false, msg: "Select a specialist" };
    if (!dailyRate) return { ok: false, msg: "Enter daily rate" };
    if (contractualRelationship === "Subcontractor" && !subcontractorCompany.trim())
      return { ok: false, msg: "Subcontractor company is required" };
    return { ok: true, msg: "" };
  };

  const handleSubmit = async (asDraft: boolean) => {
    const v = checkBasicValidity();
    if (!v.ok) return alert(v.msg);

    if (!asDraft && (!mustHaveMatch || !niceToHaveMatch)) {
      return alert("For submission, please fill Must-Have Match and Nice-to-Have Match (%)");
    }

    try {
      if (!access || !request) throw new Error("Not authenticated");

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
      alert(e?.message || "Failed to create offer");
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
        </div>
      </div>

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
                    {request.startDate} - {request.endDate}
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
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Linked contract quick block (string) */}
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
                  <span className="text-gray-900">€{(parseFloat(dailyRate) * request.totalManDays).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Onsite Days</span>
                  <span className="text-gray-900">{request.onsiteDays}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Travel Cost</span>
                  <span className="text-gray-900">€{((parseFloat(travelCost) || 0) * request.onsiteDays).toLocaleString()}</span>
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
                disabled={!selectedSpecialistId || !dailyRate || !mustHaveMatch || !niceToHaveMatch}
                className={`w-full px-4 py-3 rounded-lg transition-colors ${
                  selectedSpecialistId && dailyRate && mustHaveMatch && niceToHaveMatch
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                Submit Offer
              </button>

              <button
                onClick={() => handleSubmit(true)}
                disabled={!selectedSpecialistId || !dailyRate}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                  selectedSpecialistId && dailyRate
                    ? "border-gray-300 text-gray-700 hover:bg-gray-50"
                    : "border-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                Save as Draft
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
