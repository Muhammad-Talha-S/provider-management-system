// frontend/src/pages/ContractDetail.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  FileText,
  DollarSign,
  Settings,
  History,
  BookOpen,
  File,
  Building,
} from "lucide-react";

import { StatusBadge } from "../components/StatusBadge";
import { useApp } from "../context/AppContext";
import { getContractById } from "../api/contracts";
import type { Contract } from "../types";

type TabKey = "overview" | "governance" | "configuration" | "pricing" | "versions";

function safeArray<T>(v: T[] | null | undefined): T[] {
  return Array.isArray(v) ? v : [];
}

function safeDateLabel(v?: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleString();
}

function monthsBetween(start?: string | null, end?: string | null): string {
  if (!start || !end) return "—";
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return "—";
  const ms = e.getTime() - s.getTime();
  const months = Math.round(ms / (1000 * 60 * 60 * 24 * 30));
  return `${months} months`;
}

function toNumber(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export const ContractDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // contractId in URL
  const navigate = useNavigate();

  // ✅ CHANGED: include currentUser
  const { tokens, currentProvider, currentUser } = useApp();
  const access = tokens?.access || "";

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [contract, setContract] = useState<Contract | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const refresh = async () => {
    if (!access || !id) return;

    setLoading(true);
    setError("");
    try {
      const c = await getContractById(access, id);
      setContract(c);
    } catch (e: any) {
      setError(e?.message || "Failed to load contract");
      setContract(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access, id]);

  const cfg = contract?.allowedConfiguration || null;

  const acceptedTypes = useMemo(() => {
    const arr = safeArray(cfg?.acceptedServiceRequestTypes);
    return arr.filter((x: any) => x?.isAccepted);
  }, [cfg?.acceptedServiceRequestTypes]);

  const pricingRows = useMemo(() => {
    return safeArray(cfg?.pricingRules?.maxDailyRates);
  }, [cfg?.pricingRules?.maxDailyRates]);

  // Versions/documents structure can vary; we show best-effort
  const versions = useMemo(
    () => safeArray<any>(contract?.versionsAndDocuments),
    [contract?.versionsAndDocuments]
  );

  const latestVersion = useMemo(() => {
    if (!versions.length) return null;
    // assume last element is latest; if not, it's still fine for demo
    return versions[versions.length - 1];
  }, [versions]);

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-gray-600">Loading contract...</p>
      </div>
    );
  }

  if (!contract || error) {
    return (
      <div className="p-8">
        <div className="text-center">
          <p className="text-gray-500">{error || "Contract not found"}</p>
          <button
            onClick={() => navigate("/contracts")}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Back to Contracts
          </button>
        </div>
      </div>
    );
  }

  const awardedToMe = Boolean(contract.isAwardedToMyProvider);
  const myAwardStatus = contract.myProviderStatus?.status || null;

  // ✅ NEW: Create-Offer button rules
  const roleCanCreateOffer =
    currentUser?.role === "Provider Admin" || currentUser?.role === "Contract Coordinator";

  const offerDeadlinePassed = (() => {
    if (!contract.offerDeadlineAt) return false;
    const d = new Date(contract.offerDeadlineAt);
    if (isNaN(d.getTime())) return false;
    return d.getTime() < Date.now();
  })();

  const myProviderStatus = String(myAwardStatus || "").toUpperCase(); // e.g. IN_NEGOTIATION / ACTIVE / REJECTED / ...
  const contractStatus = String(contract.status || "").toUpperCase(); // global: PUBLISHED/ACTIVE...

  // providers can submit offers when contract is PUBLISHED (and deadline not passed)
  const canCreateOffer =
    roleCanCreateOffer &&
    contractStatus === "PUBLISHED" &&
    !offerDeadlinePassed &&
    myProviderStatus !== "ACTIVE" &&
    myProviderStatus !== "IN_NEGOTIATION";

  const createOfferDisabledReason = (() => {
    if (!roleCanCreateOffer) return "Only Provider Admin or Contract Coordinator can create contract offers.";
    if (contractStatus !== "PUBLISHED") return "Offers can only be created while the contract is PUBLISHED.";
    if (offerDeadlinePassed) return "Offer deadline has passed.";
    if (myProviderStatus === "ACTIVE") return "This contract is already ACTIVE for your provider.";
    if (myProviderStatus === "IN_NEGOTIATION") return "Offer already submitted (IN_NEGOTIATION).";
    return "Offer cannot be created right now.";
  })();

  const onCreateOfferClick = () => {
    if (!canCreateOffer) {
      alert(createOfferDisabledReason);
      return;
    }
    navigate(`/contract-offers/create?contractId=${encodeURIComponent(contract.contractId)}`);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/contracts")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Contracts
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl text-gray-900">{contract.title}</h1>
            <p className="text-gray-500 mt-1">
              {contract.contractId}
              {contract.kind ? ` • ${contract.kind}` : ""}
              {currentProvider?.id ? ` • Provider: ${currentProvider.id}` : ""}
            </p>
          </div>
          <StatusBadge status={contract.status} />
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 mb-6">
        <p className="text-sm text-blue-900">
          <strong>Note:</strong> All contract information is read-only within the Provider Management System.
          Contracts are published and awarded by Contract Management (Group 2).
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-4 px-1 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "overview"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText size={18} />
              <span>Contract Overview</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("governance")}
            className={`pb-4 px-1 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "governance"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <div className="flex items-center gap-2">
              <BookOpen size={18} />
              <span>Scope & Governance</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("configuration")}
            className={`pb-4 px-1 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "configuration"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <div className="flex items-center gap-2">
              <Settings size={18} />
              <span>Allowed Configuration</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("pricing")}
            className={`pb-4 px-1 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "pricing"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <div className="flex items-center gap-2">
              <DollarSign size={18} />
              <span>Pricing Rules</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("versions")}
            className={`pb-4 px-1 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "versions"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <div className="flex items-center gap-2">
              <History size={18} />
              <span>Versions & Documents</span>
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Timeline */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg text-gray-900 mb-4">Contract Timeline</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Publishing Date</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar size={16} className="text-gray-400" />
                    <p className="text-sm text-gray-900">{safeDateLabel(contract.publishingDate)}</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500">Offer Deadline</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar size={16} className="text-gray-400" />
                    <p className="text-sm text-gray-900">{safeDateLabel(contract.offerDeadlineAt)}</p>
                  </div>
                  {offerDeadlinePassed && (
                    <p className="text-xs text-red-600 mt-1">Offer deadline has passed.</p>
                  )}
                </div>

                <div>
                  <label className="text-xs text-gray-500">My Award Status</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {awardedToMe ? (myAwardStatus || "AWARDED") : "Not awarded to my provider"}
                  </p>
                </div>

                <div>
                  <label className="text-xs text-gray-500">Current Version</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {latestVersion?.version ? `v${latestVersion.version}` : "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg text-gray-900 mb-4">Contract Summary</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Contract ID</label>
                  <p className="text-sm text-gray-900 mt-1">{contract.contractId}</p>
                </div>

                <div>
                  <label className="text-xs text-gray-500">Status</label>
                  <div className="mt-1">
                    <StatusBadge status={contract.status} />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500">Duration</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {monthsBetween(contract.publishingDate || null, contract.offerDeadlineAt || null)}
                  </p>
                </div>

                <div>
                  <label className="text-xs text-gray-500">Accepted SR Types</label>
                  <p className="text-sm text-gray-900 mt-1">{acceptedTypes.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {contract.status === "ACTIVE" && (
              <div className="bg-green-50 rounded-lg border border-green-200 p-4">
                <div className="flex items-start gap-3">
                  <Settings size={20} className="text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-green-900">Active Contract</p>
                    <p className="text-xs text-green-700 mt-1">This contract is currently active.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Provider box */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm text-gray-900 mb-4">Provider</h3>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Building size={16} className="text-gray-400" />
                <span>{currentProvider?.name || "—"}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">{currentProvider?.id || ""}</div>
            </div>

            {/* ✅ NEW: Actions card (Create Contract Offer) */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm text-gray-900 mb-4">Actions</h3>

              <button
                type="button"
                onClick={onCreateOfferClick}
                className={`w-full px-4 py-3 rounded-lg transition-colors ${
                  canCreateOffer
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                }`}
              >
                {myProviderStatus === "IN_NEGOTIATION"
                  ? "Offer Submitted (In Negotiation)"
                  : "Create Contract Offer"}
              </button>

              <p className="text-xs text-gray-500 mt-3">
                You can only edit <strong>pricing rules</strong>. Currency stays the same.
              </p>

              {!canCreateOffer && (
                <p className="text-xs text-gray-500 mt-2">{createOfferDisabledReason}</p>
              )}
            </div>

            {/* Configuration Summary */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm text-gray-900 mb-4">Configuration Summary</h3>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500">Domains</label>
                  <p className="text-sm text-gray-900 mt-1">{safeArray(cfg?.domains).length}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Roles</label>
                  <p className="text-sm text-gray-900 mt-1">{safeArray(cfg?.roles).length}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Experience Levels</label>
                  <p className="text-sm text-gray-900 mt-1">{safeArray(cfg?.experienceLevels).length}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Pricing Rows</label>
                  <p className="text-sm text-gray-900 mt-1">{pricingRows.length}</p>
                </div>
              </div>

              <div className="mt-4">
                <Link to="/service-requests" className="text-sm text-blue-600 hover:text-blue-700">
                  Go to Service Requests →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "governance" && (
        <div className="space-y-6">
          {/* Stakeholders */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg text-gray-900 mb-4">Stakeholders</h2>
            <div className="text-sm text-gray-700 space-y-1">
              <div>Procurement: {contract.stakeholders?.procurementManager || "—"}</div>
              <div>Legal: {contract.stakeholders?.legalCounsel || "—"}</div>
              <div>Administrator: {contract.stakeholders?.contractAdministrator || "—"}</div>
            </div>
          </div>

          {/* Scope of Work */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg text-gray-900 mb-4">Scope of Work</h2>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {contract.scopeOfWork || "—"}
            </p>
          </div>

          {/* Terms and Conditions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg text-gray-900 mb-4">Terms and Conditions</h2>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {contract.termsAndConditions || "—"}
            </p>
          </div>

          {/* Weighting */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg text-gray-900 mb-4">Functional vs Commercial Weighting</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-xs text-gray-500">Functional Weight</label>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full"
                      style={{ width: `${contract.weighting?.functional ?? 50}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-900">{contract.weighting?.functional ?? 50}%</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500">Commercial Weight</label>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-green-600 h-3 rounded-full"
                      style={{ width: `${contract.weighting?.commercial ?? 50}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-900">{contract.weighting?.commercial ?? 50}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "configuration" && (
        <div className="space-y-6">
          {/* Allowed Parameters */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg text-gray-900 mb-6">Allowed Configuration Parameters</h2>

            <div className="space-y-6">
              <div>
                <label className="text-sm text-gray-700 mb-3 block">Allowed Domains</label>
                <div className="flex flex-wrap gap-2">
                  {safeArray(cfg?.domains).length ? (
                    safeArray(cfg?.domains).map((domain, index) => (
                      <span
                        key={index}
                        className="px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm border border-green-200"
                      >
                        {domain}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">—</span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-700 mb-3 block">Allowed Roles</label>
                <div className="flex flex-wrap gap-2">
                  {safeArray(cfg?.roles).length ? (
                    safeArray(cfg?.roles).map((role, index) => (
                      <span
                        key={index}
                        className="px-3 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm border border-purple-200"
                      >
                        {role}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">—</span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-700 mb-3 block">Experience Levels</label>
                <div className="flex flex-wrap gap-2">
                  {safeArray(cfg?.experienceLevels).length ? (
                    safeArray(cfg?.experienceLevels).map((level, index) => (
                      <span
                        key={index}
                        className="px-3 py-2 bg-orange-50 text-orange-700 rounded-lg text-sm border border-orange-200"
                      >
                        {level}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">—</span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-700 mb-3 block">Technology Levels</label>
                <div className="flex flex-wrap gap-2">
                  {safeArray(cfg?.technologyLevels).length ? (
                    safeArray(cfg?.technologyLevels).map((level, index) => (
                      <span
                        key={index}
                        className="px-3 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm border border-gray-200"
                      >
                        {level}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">—</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Service Request Types */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg text-gray-900 mb-6">Allowed Service Request Types</h2>

            <div className="space-y-4">
              {acceptedTypes.length ? (
                acceptedTypes.map((t: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200"
                  >
                    <div className="text-sm text-gray-900">
                      <div className="font-medium">{t.type}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        biddingDeadlineDays: {t.biddingDeadlineDays} · offerCycles: {t.offerCycles}
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                      Accepted
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No request types configured.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "pricing" && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg text-gray-900">Pricing Rules and Maximum Daily Rates</h2>
            <p className="text-sm text-gray-500 mt-1">
              Maximum daily rates defined per role, experience level, and technology level
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs text-gray-500">Role</th>
                  <th className="px-6 py-3 text-left text-xs text-gray-500">Experience Level</th>
                  <th className="px-6 py-3 text-left text-xs text-gray-500">Technology Level</th>
                  <th className="px-6 py-3 text-left text-xs text-gray-500">Maximum Daily Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pricingRows.length ? (
                  pricingRows.map((row: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{row.role}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                          {row.experienceLevel}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">
                          {row.technologyLevel}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900">
                          {cfg?.pricingRules?.currency || "EUR"}{" "}
                          {toNumber(row.maxDailyRate).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-6 py-6 text-sm text-gray-500" colSpan={4}>
                      No pricing limits configured.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "versions" && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg text-gray-900 mb-2">Versions & Documents</h2>
            <p className="text-sm text-gray-500">Version history from Contract Management (Group 2)</p>
          </div>

          {versions.length ? (
            versions.map((v: any, index: number) => {
              const documents = safeArray<any>(v?.documents);
              return (
                <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600">v{v?.version ?? "—"}</span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-900">Version {v?.version ?? "—"}</p>
                        <p className="text-xs text-gray-500 mt-1">{safeDateLabel(v?.versionDate)}</p>
                      </div>
                    </div>

                    <span className="px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                      {String(v?.status || "—")}
                    </span>
                  </div>

                  <div className="mb-4">
                    <label className="text-xs text-gray-500">Change Summary</label>
                    <p className="text-sm text-gray-700 mt-1">{v?.changeSummary || "—"}</p>
                  </div>

                  {documents.length > 0 && (
                    <div className="pt-4 border-t border-gray-200 space-y-2">
                      {documents.map((d: any, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          <File size={16} className="text-gray-400" />
                          <a
                            href={d?.url || "#"}
                            className="text-sm text-blue-600 hover:text-blue-700"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {d?.name || "Document"}
                          </a>
                          <span className="text-xs text-gray-500">{d?.type ? `(${d.type})` : ""}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-sm text-gray-500">No version history available.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ContractDetail;
