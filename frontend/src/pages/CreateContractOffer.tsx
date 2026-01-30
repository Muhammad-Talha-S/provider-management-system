import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, AlertCircle } from "lucide-react";

import { useApp } from "../context/AppContext";
import { getContractById, createContractOffer } from "../api/contracts";
import { StatusBadge } from "../components/StatusBadge";
import type { Contract } from "../types";

function safeArr<T>(v: any): T[] {
  return Array.isArray(v) ? v : [];
}

function toNumber(v: any): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export const CreateContractOfferPage: React.FC = () => {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const { tokens, currentUser } = useApp();
  const access = tokens?.access || "";

  const contractId = sp.get("contractId") || "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [contract, setContract] = useState<Contract | null>(null);
  const [note, setNote] = useState("");

  const [rows, setRows] = useState<any[]>([]);
  const [currency, setCurrency] = useState<string>("EUR");

  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  const canSubmitRole =
    currentUser?.role === "Provider Admin" || currentUser?.role === "Contract Coordinator";

  const load = async () => {
    if (!access || !contractId) return;
    setLoading(true);
    setErr(null);
    try {
      const c = await getContractById(access, contractId);
      setContract(c);

      const pr = (c as any)?.allowedConfiguration?.pricingRules || {};
      const maxDailyRates = safeArr<any>(pr?.maxDailyRates);

      setCurrency(String(pr?.currency || "EUR"));
      // create editable copy
      setRows(
        maxDailyRates.map((r) => ({
          role: r.role,
          experienceLevel: r.experienceLevel,
          technologyLevel: r.technologyLevel,
          maxDailyRate: toNumber(r.maxDailyRate),
        }))
      );
    } catch (e: any) {
      setErr(e?.message || "Failed to load contract");
      setContract(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access, contractId]);

  const originalRows = useMemo(() => {
    const pr = (contract as any)?.allowedConfiguration?.pricingRules || {};
    return safeArr<any>(pr?.maxDailyRates);
  }, [contract]);

  const validate = (): { ok: boolean; msg?: string } => {
    if (!canSubmitRole) return { ok: false, msg: "Only Provider Admin or Contract Coordinator can create contract offers." };
    if (!contract) return { ok: false, msg: "Contract not loaded." };

    for (let i = 0; i < rows.length; i++) {
      const v = rows[i]?.maxDailyRate;
      if (v === "" || v === null || v === undefined) return { ok: false, msg: "All maxDailyRate values are required." };
      const n = Number(v);
      if (!Number.isFinite(n)) return { ok: false, msg: "maxDailyRate must be numeric." };
      if (n < 0) return { ok: false, msg: "maxDailyRate must be >= 0." };
    }
    return { ok: true };
  };

  const handleSubmit = async (asDraft: boolean) => {
    setSubmitErr(null);
    const v = validate();
    if (!v.ok) {
      setSubmitErr(v.msg || "Invalid input");
      return;
    }
    if (!access || !contract) return;

    setSubmitting(true);
    try {
      await createContractOffer(access, contract.contractId, {
        status: asDraft ? "DRAFT" : "SUBMITTED",
        note: note || undefined,
        proposedPricingRules: {
          currency,
          maxDailyRates: rows.map((r) => ({
            role: r.role,
            experienceLevel: r.experienceLevel,
            technologyLevel: r.technologyLevel,
            maxDailyRate: Number(r.maxDailyRate),
          })),
        },
      });

      // After submit, go back to contract details
      navigate(`/contracts/${encodeURIComponent(contract.contractId)}`);
    } catch (e: any) {
      setSubmitErr(e?.message || "Failed to create contract offer");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-gray-600">Loading...</div>;

  if (err || !contract) {
    return (
      <div className="p-8">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <p className="text-gray-700">{err || "Contract not found"}</p>
          <button onClick={() => navigate("/contracts")} className="mt-4 text-blue-600 hover:text-blue-700">
            Back to Contracts
          </button>
        </div>
      </div>
    );
  }

  const prCurrency = currency || "EUR";

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(`/contracts/${encodeURIComponent(contract.contractId)}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Contract
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl text-gray-900">Create Contract Offer</h1>
            <p className="text-gray-500 mt-1">
              Contract: <span className="font-mono">{contract.contractId}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge status={String((contract as any).status || "-")} />
          </div>
        </div>
      </div>
      {submitErr && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-yellow-700 mt-0.5" />
            <div>
              <div className="text-sm text-yellow-900 font-medium">Cannot submit offer</div>
              <div className="text-sm text-yellow-800 mt-1">{submitErr}</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Current Pricing Rules */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg text-gray-900">Current Pricing Rules</h2>
            <p className="text-sm text-gray-500 mt-1">Original contract pricing limits</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs text-gray-500">Role</th>
                  <th className="px-6 py-3 text-left text-xs text-gray-500">Experience</th>
                  <th className="px-6 py-3 text-left text-xs text-gray-500">Technology</th>
                  <th className="px-6 py-3 text-left text-xs text-gray-500">Max Daily Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {originalRows.length ? (
                  originalRows.map((r: any, idx: number) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 text-sm text-gray-900">{r.role}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{r.experienceLevel}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{r.technologyLevel}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {prCurrency} {toNumber(r.maxDailyRate).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-6 py-6 text-sm text-gray-500" colSpan={4}>
                      No pricing rules configured.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Offer Pricing Rules */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg text-gray-900">New Offer Pricing Rules </h2>
            <p className="text-sm text-gray-500 mt-1">
              <strong>Maximum Daily Rate</strong>
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs text-gray-500">Role</th>
                  <th className="px-6 py-3 text-left text-xs text-gray-500">Experience</th>
                  <th className="px-6 py-3 text-left text-xs text-gray-500">Technology</th>
                  <th className="px-6 py-3 text-left text-xs text-gray-500">Max Daily Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rows.length ? (
                  rows.map((r: any, idx: number) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 text-sm text-gray-900">{r.role}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{r.experienceLevel}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{r.technologyLevel}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-700">{prCurrency}</span>
                          <input
                            type="number"
                            value={r.maxDailyRate}
                            onChange={(e) => {
                              const v = e.target.value;
                              setRows((prev) =>
                                prev.map((x, i) => (i === idx ? { ...x, maxDailyRate: v } : x))
                              );
                            }}
                            className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-6 py-6 text-sm text-gray-500" colSpan={4}>
                      No pricing rules configured.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-6 border-t border-gray-200 space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Note (optional)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                rows={3}
                placeholder="Add a note to Contract Management"
              />
            </div>

            {!canSubmitRole && (
              <div className="text-sm text-red-600">
                Only Provider Admin or Contract Coordinator can create contract offers.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={() => handleSubmit(false)}
                disabled={submitting || !canSubmitRole}
                className={`w-full px-4 py-3 rounded-lg transition-colors ${
                  !submitting && canSubmitRole
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                {submitting ? "Submitting..." : "Submit Offer"}
              </button>

              <button
                onClick={() => handleSubmit(true)}
                disabled={submitting || !canSubmitRole}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                  !submitting && canSubmitRole
                    ? "border-gray-300 text-gray-700 hover:bg-gray-50"
                    : "border-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                {submitting ? "Saving..." : "Save as Draft"}
              </button>
            </div>

            <button
              onClick={() => navigate(`/contracts/${encodeURIComponent(contract.contractId)}`)}
              className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateContractOfferPage;
