import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  FileText,
  Settings,
  BookOpen,
  History,
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
import type { Contract, ContractOffer, CreateContractOfferPayload } from "../api/contracts";

type TabKey = "overview" | "governance" | "configuration" | "offers";

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
    currentUser?.role === "Contract Coordinator" ||
    currentUser?.role === "Supplier Representative";

  const canOfferNow = contract?.status === "Published" || contract?.status === "In Negotiation";

  const refresh = async () => {
    if (!access || !id) return;

    setLoading(true);
    setError("");
    try {
      const c = await getContractById(access, id);
      setContract(c);

      const myOffers = await getMyContractOffers(access, id);
      setOffers(myOffers);
    } catch (e: any) {
      setError(e?.message || "Failed to load contract");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access, id]);

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
          <button onClick={() => navigate("/contracts")} className="mt-4 text-blue-600 hover:text-blue-700">
            Back to Contracts
          </button>
        </div>
      </div>
    );
  }

  const awardedToMe = !!contract.awardedProviderId && contract.awardedProviderId === currentProvider?.id;

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
              {contract.id} • {contract.kind}
              {contract.awardedProviderId ? ` • Awarded: ${contract.awardedProviderId}` : ""}
            </p>
          </div>
          <StatusBadge status={contract.status} />
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 mb-6">
        <p className="text-sm text-blue-900">
          <strong>Note:</strong> Contract information is read-only within the Provider Management System.
          Contracts are published and awarded by Contract Management (Group 2). Providers negotiate by submitting offers.
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
              <span>Overview</span>
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
              <span>Request Rules</span>
            </div>
          </button>

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

      {/* Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left content */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === "overview" && (
            <>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg text-gray-900 mb-4">Timeline</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500">Published</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar size={16} className="text-gray-400" />
                      <p className="text-sm text-gray-900">{contract.publishedAt || "-"}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Status</label>
                    <div className="mt-1">
                      <StatusBadge status={contract.status} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Start</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar size={16} className="text-gray-400" />
                      <p className="text-sm text-gray-900">{contract.startDate || "-"}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">End</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar size={16} className="text-gray-400" />
                      <p className="text-sm text-gray-900">{contract.endDate || "-"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {contract.awardedProviderId && (
                <div
                  className={`rounded-lg border p-4 ${
                    awardedToMe ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"
                  }`}
                >
                  <p className={`text-sm ${awardedToMe ? "text-green-900" : "text-yellow-900"}`}>
                    <strong>Award:</strong> This contract is awarded to <strong>{contract.awardedProviderId}</strong>.
                  </p>
                  {awardedToMe && contract.status === "Active" && (
                    <p className="text-xs text-green-700 mt-1">
                      Service Requests under this contract will be visible to your provider in the Service Requests page.
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {activeTab === "governance" && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg text-gray-900 mb-4">Scope of Work</h2>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {contract.scopeOfWork || "—"}
                </p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg text-gray-900 mb-4">Terms & Conditions</h2>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {contract.termsAndConditions || "Standard terms and conditions apply as per framework agreement."}
                </p>
              </div>

              {(contract.functionalWeight != null || contract.commercialWeight != null) && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-lg text-gray-900 mb-4">Evaluation Weighting</h2>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs text-gray-500">Functional</label>
                      <p className="text-sm text-gray-900 mt-1">{contract.functionalWeight ?? 0}%</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Commercial</label>
                      <p className="text-sm text-gray-900 mt-1">{contract.commercialWeight ?? 0}%</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "configuration" && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg text-gray-900 mb-4">Allowed Service Request Types</h2>

                {!contract.allowedRequestConfigs || Object.keys(contract.allowedRequestConfigs).length === 0 ? (
                  <p className="text-sm text-gray-500">No request rules configured.</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(contract.allowedRequestConfigs).map(([type, cfg]) => (
                      <div
                        key={type}
                        className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200"
                      >
                        <span className="text-sm text-gray-900">{type}</span>
                        <span className="text-xs text-blue-700">
                          Deadline: {cfg.offerDeadlineDays}d • Cycles: {cfg.cycles}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "offers" && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg text-gray-900 mb-4">Your Offers</h2>

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
                            Submitted: {o.submittedAt ? new Date(o.submittedAt).toLocaleString() : "-"}
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
                          <div className="text-gray-600 whitespace-pre-line">Terms: {o.proposedTerms}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column actions */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm text-gray-900 mb-4">Provider</h3>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Building size={16} className="text-gray-400" />
              <span>{currentProvider?.name || "-"}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">{currentProvider?.id || ""}</div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm text-gray-900 mb-4">Actions</h3>

            {!canSubmitOffer && (
              <div className="text-sm text-gray-600">
                Only Contract Coordinator / Supplier Representative can submit offers.
              </div>
            )}

            {canSubmitOffer && !canOfferNow && (
              <div className="text-sm text-gray-600">
                Offers are only allowed when the contract is <strong>Published</strong> or <strong>In Negotiation</strong>.
              </div>
            )}

            {canSubmitOffer && canOfferNow && !showOfferForm && (
              <button
                onClick={() => setShowOfferForm(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus size={18} />
                Submit Contract Offer
              </button>
            )}

            {canSubmitOffer && canOfferNow && showOfferForm && (
              <ContractOfferForm onSubmit={submitOffer} onCancel={() => setShowOfferForm(false)} />
            )}

            {latestOffer && (
              <div className="mt-4 p-3 rounded-lg bg-gray-50 border border-gray-200">
                <div className="text-xs text-gray-500">Latest Offer</div>
                <div className="mt-1 flex items-center justify-between">
                  <div className="text-sm text-gray-900">Offer #{latestOffer.id}</div>
                  <OfferStatusBadge status={latestOffer.status} />
                </div>
              </div>
            )}
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
    </div>
  );
};

export default ContractDetail;
