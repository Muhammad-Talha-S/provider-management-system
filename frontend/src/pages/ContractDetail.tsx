// src/pages/ContractDetail.tsx
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
  Plus,
  Building,
} from "lucide-react";

import { StatusBadge } from "../components/StatusBadge";
import OfferStatusBadge from "../components/OfferStatusBadge";
import ContractOfferForm from "../components/ContractOfferForm";

import { useApp } from "../context/AppContext";
import {
  getContractById,
  getMyContractOffers,
  createContractOffer,
} from "../api/contracts";
import type {
  Contract,
  ContractOffer,
  CreateContractOfferPayload,
  PricingLimit,
  OfferCycle,
  VersionHistoryItem,
} from "../api/contracts";

type TabKey =
  | "overview"
  | "governance"
  | "configuration"
  | "pricing"
  | "versions"
  | "offers";

function safeArray<T>(v: T[] | null | undefined): T[] {
  return Array.isArray(v) ? v : [];
}

function safeDateLabel(v?: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  // if backend sends ISO date-only, this is still fine
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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { tokens, currentUser, currentProvider } = useApp();
  const access = tokens?.access || "";

  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const [contract, setContract] = useState<Contract | null>(null);
  const [offers, setOffers] = useState<ContractOffer[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const [showOfferForm, setShowOfferForm] = useState(false);

  const canSubmitOffer =
    currentUser?.role === "Provider Admin" ||
    currentUser?.role === "Contract Coordinator" ||
    currentUser?.role === "Supplier Representative";

  const canOfferNow =
    contract?.status === "Published" || contract?.status === "In Negotiation";

  const refresh = async () => {
    if (!access || !id) return;

    setLoading(true);
    setError("");
    try {
      const c = await getContractById(access, id);
      setContract(c);

      // Only fetch offers if user has provider context (should always exist for provider portal)
      const myOffers = await getMyContractOffers(access, id);
      setOffers(myOffers);
    } catch (e: any) {
      setError(e?.message || "Failed to load contract");
      setContract(null);
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access, id]);

  const latestVersion = useMemo(() => {
    const vh = safeArray(contract?.versionHistory as VersionHistoryItem[] | undefined);
    if (!vh.length) return null;
    return vh[vh.length - 1];
  }, [contract]);

  const latestOffer = useMemo(() => {
    if (!offers.length) return null;
    return [...offers].sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))[0];
  }, [offers]);

  const submitOffer = async (payload: CreateContractOfferPayload) => {
    if (!access || !id) return;
    await createContractOffer(access, id, payload);
    setShowOfferForm(false);
    await refresh();
    setActiveTab("offers");
  };

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

  const awardedToMe =
    !!contract.awardedProviderId &&
    contract.awardedProviderId === currentProvider?.id;

  const acceptedRequestTypes = safeArray(contract.acceptedRequestTypes);
  const allowedDomains = safeArray(contract.allowedDomains);
  const allowedRoles = safeArray(contract.allowedRoles);
  const experienceLevels = safeArray(contract.experienceLevels);

  const offerCyclesAndDeadlines = safeArray(
    contract.offerCyclesAndDeadlines as OfferCycle[] | undefined
  );

  const pricingLimits = safeArray(
    contract.pricingLimits as PricingLimit[] | undefined
  );

  const versionHistory = safeArray(
    contract.versionHistory as VersionHistoryItem[] | undefined
  );

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
              {contract.id}
              {contract.kind ? ` • ${contract.kind}` : ""}
              {contract.awardedProviderId ? ` • Awarded: ${contract.awardedProviderId}` : ""}
            </p>
          </div>
          <StatusBadge status={contract.status} />
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 mb-6">
        <p className="text-sm text-blue-900">
          <strong>Note:</strong> All contract information is read-only within the Provider Management System.
          Contracts are published and awarded by Contract Management (Group 2). Providers negotiate by submitting offers.
        </p>
      </div>

      {/* Award banner */}
      {contract.awardedProviderId && (
        <div
          className={`rounded-lg border p-4 mb-6 ${
            awardedToMe
              ? "bg-green-50 border-green-200"
              : "bg-yellow-50 border-yellow-200"
          }`}
        >
          <p
            className={`text-sm ${
              awardedToMe ? "text-green-900" : "text-yellow-900"
            }`}
          >
            <strong>Award:</strong> This contract is awarded to{" "}
            <strong>{contract.awardedProviderId}</strong>
            {awardedToMe ? " (your provider)" : ""}.
          </p>
          {awardedToMe && contract.status === "Active" && (
            <p className="text-xs text-green-700 mt-1">
              Service Requests under this contract will be visible to your provider.
            </p>
          )}
        </div>
      )}

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

          {/* ✅ Offers tab (keep from your API version) */}
          <button
            onClick={() => setActiveTab("offers")}
            className={`pb-4 px-1 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "offers"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <div className="flex items-center gap-2">
              <History size={18} />
              <span>Offers</span>
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Timeline */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg text-gray-900 mb-4">Contract Timeline</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Publishing Date</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar size={16} className="text-gray-400" />
                    <p className="text-sm text-gray-900">{safeDateLabel(contract.publishedAt)}</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500">Offer Deadline</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar size={16} className="text-gray-400" />
                    <p className="text-sm text-gray-900">{safeDateLabel(contract.offerDeadline)}</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500">Start Date</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar size={16} className="text-gray-400" />
                    <p className="text-sm text-gray-900">{contract.startDate || "—"}</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500">End Date</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar size={16} className="text-gray-400" />
                    <p className="text-sm text-gray-900">{contract.endDate || "—"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg text-gray-900 mb-4">Contract Summary</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Contract ID</label>
                  <p className="text-sm text-gray-900 mt-1">{contract.id}</p>
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
                    {monthsBetween(contract.startDate, contract.endDate)}
                  </p>
                </div>

                <div>
                  <label className="text-xs text-gray-500">Current Version</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {latestVersion ? `v${latestVersion.version}` : "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Status Info */}
          <div className="space-y-6">
            {contract.status === "Active" && (
              <div className="bg-green-50 rounded-lg border border-green-200 p-4">
                <div className="flex items-start gap-3">
                  <Settings size={20} className="text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-green-900">Active Contract</p>
                    <p className="text-xs text-green-700 mt-1">
                      This contract is currently active and accepting service requests.
                    </p>
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

            {/* Configuration Summary */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm text-gray-900 mb-4">Configuration Summary</h3>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500">Request Types</label>
                  <p className="text-sm text-gray-900 mt-1">{acceptedRequestTypes.length} types</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Allowed Domains</label>
                  <p className="text-sm text-gray-900 mt-1">{allowedDomains.length} domains</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Allowed Roles</label>
                  <p className="text-sm text-gray-900 mt-1">{allowedRoles.length} roles</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Pricing Rules</label>
                  <p className="text-sm text-gray-900 mt-1">{pricingLimits.length} configured</p>
                </div>
              </div>
            </div>

            {/* Latest offer (quick glance) */}
            {latestOffer && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-sm text-gray-900 mb-3">Latest Offer</h3>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-900">Offer #{latestOffer.id}</div>
                  <OfferStatusBadge status={latestOffer.status} />
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Submitted:{" "}
                  {latestOffer.submittedAt
                    ? new Date(latestOffer.submittedAt).toLocaleString()
                    : "—"}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "governance" && (
        <div className="space-y-6">
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
              {contract.termsAndConditions ||
                "Standard terms and conditions apply as per framework agreement."}
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
                      style={{ width: `${contract.functionalWeight ?? 50}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-900">{contract.functionalWeight ?? 50}%</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500">Commercial Weight</label>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-green-600 h-3 rounded-full"
                      style={{ width: `${contract.commercialWeight ?? 50}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-900">{contract.commercialWeight ?? 50}%</span>
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
                  {allowedDomains.length ? (
                    allowedDomains.map((domain, index) => (
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
                  {allowedRoles.length ? (
                    allowedRoles.map((role, index) => (
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
                  {experienceLevels.length ? (
                    experienceLevels.map((level, index) => (
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
            </div>
          </div>

          {/* Service Request Types */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg text-gray-900 mb-6">Allowed Service Request Types</h2>

            <div className="space-y-4">
              {acceptedRequestTypes.length ? (
                acceptedRequestTypes.map((type, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200"
                  >
                    <span className="text-sm text-gray-900">{type}</span>
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

          {/* Offer Cycles */}
          {offerCyclesAndDeadlines.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg text-gray-900">Offer Cycles and Deadlines</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs text-gray-500">Request Type</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-500">Offer Cycle</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-500">Response Deadline</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {offerCyclesAndDeadlines.map((cycle, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{cycle.requestType}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{cycle.cycle}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{cycle.deadline}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
                {pricingLimits.length ? (
                  pricingLimits.map((limit, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{limit.role}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                          {limit.experienceLevel}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {limit.technologyLevel ? (
                          <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">
                            {limit.technologyLevel}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {/* ✅ SAFE: maxRate may come as string from JSON */}
                        <span className="text-sm text-gray-900">
                          €{toNumber((limit as any).maxRate).toFixed(2)}
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
            <h2 className="text-lg text-gray-900 mb-2">Version History & Documents</h2>
            <p className="text-sm text-gray-500">
              Complete history of contract versions with status and downloadable documents
            </p>
          </div>

          {versionHistory.length ? (
            versionHistory.map((version, index) => (
              <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600">v{version.version}</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-900">Version {version.version}</p>
                      <p className="text-xs text-gray-500 mt-1">{version.date}</p>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs ${
                      version.status === "Signed"
                        ? "bg-green-100 text-green-700"
                        : version.status === "Proposed"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {version.status}
                  </span>
                </div>

                <div className="mb-4">
                  <label className="text-xs text-gray-500">Changes</label>
                  <p className="text-sm text-gray-700 mt-1">{version.changes}</p>
                </div>

                {version.documentLink && (
                  <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                    <File size={16} className="text-gray-400" />
                    <a
                      href={version.documentLink}
                      className="text-sm text-blue-600 hover:text-blue-700"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Download Contract Document (PDF)
                    </a>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-sm text-gray-500">No version history available.</p>
            </div>
          )}
        </div>
      )}

      {/* ✅ Offers tab (API-backed) */}
      {activeTab === "offers" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Offers list */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-lg text-gray-900">Your Offers</h2>

                {canSubmitOffer && canOfferNow && !showOfferForm && (
                  <button
                    onClick={() => setShowOfferForm(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus size={18} />
                    Submit Offer
                  </button>
                )}
              </div>

              {!canSubmitOffer && (
                <div className="text-sm text-gray-600 mb-4">
                  Only Provider Admin / Contract Coordinator / Supplier Representative can submit offers.
                </div>
              )}

              {canSubmitOffer && !canOfferNow && (
                <div className="text-sm text-gray-600 mb-4">
                  Offers are only allowed when the contract is <strong>Published</strong> or{" "}
                  <strong>In Negotiation</strong>.
                </div>
              )}

              {canSubmitOffer && canOfferNow && showOfferForm && (
                <div className="mb-4">
                  <ContractOfferForm
                    onSubmit={submitOffer}
                    onCancel={() => setShowOfferForm(false)}
                  />
                </div>
              )}

              {offers.length === 0 ? (
                <p className="text-sm text-gray-500">No offers submitted yet.</p>
              ) : (
                <div className="space-y-3">
                  {offers.map((o) => (
                    <div key={o.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm text-gray-900">Offer #{o.id}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            Submitted:{" "}
                            {o.submittedAt ? new Date(o.submittedAt).toLocaleString() : "—"}
                          </div>
                        </div>
                        <OfferStatusBadge status={o.status} />
                      </div>

                      <div className="mt-3 text-sm text-gray-700 space-y-1">
                        {o.proposedDailyRate != null && (
                          <div>Proposed Daily Rate: €{Number(o.proposedDailyRate).toLocaleString()}</div>
                        )}
                        {o.note && <div>Note: {o.note}</div>}
                        {o.proposedTerms && (
                          <div className="text-gray-600 whitespace-pre-line">
                            Terms: {o.proposedTerms}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Quick actions/status */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm text-gray-900 mb-4">Contract Status</h3>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Status</span>
                <StatusBadge status={contract.status} />
              </div>
              <div className="text-xs text-gray-500 mt-3">
                Published: {safeDateLabel(contract.publishedAt)}
              </div>
              <div className="text-xs text-gray-500">
                Deadline: {safeDateLabel(contract.offerDeadline)}
              </div>
            </div>

            {awardedToMe && contract.status === "Active" && (
              <div className="bg-green-50 rounded-lg border border-green-200 p-4 text-sm text-green-900">
                This contract is active and awarded to your provider.
                <div className="mt-2">
                  <Link to="/service-requests" className="underline">
                    Go to Service Requests →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractDetail;
