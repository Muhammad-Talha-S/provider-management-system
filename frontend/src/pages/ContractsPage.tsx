// src/pages/ContractsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileCheck, Building2, RefreshCw } from "lucide-react";

import { StatusBadge } from "../components/StatusBadge";
import { useApp } from "../context/AppContext";
import { getContracts, syncContractsFromGroup2 } from "../api/contracts";
import type { Contract } from "../types";

export const ContractsPage: React.FC = () => {
  const { tokens, currentUser } = useApp();
  const access = tokens?.access || "";

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const canSync =
    currentUser?.role === "Provider Admin" || currentUser?.role === "Contract Coordinator";

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getContracts(access);
      setContracts(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load contracts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!access) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access]);

  const doSync = async () => {
    if (!access) return;
    setSyncing(true);
    setError(null);
    try {
      await syncContractsFromGroup2(access);
      await load();
    } catch (e: any) {
      setError(e?.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const sorted = useMemo(() => {
    const rank = (s: string) => {
      const order = ["PUBLISHED", "IN_NEGOTIATION", "ACTIVE", "AWARDED", "EXPIRED", "DRAFT"];
      const idx = order.indexOf(String(s || "").toUpperCase());
      return idx === -1 ? 999 : idx;
    };
    return [...contracts].sort((a, b) => rank(a.status) - rank(b.status));
  }, [contracts]);

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-gray-600">Loading contracts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl text-gray-900">Contracts</h1>
          <p className="text-gray-500 mt-1">
            Published contracts from Contract Management (Group 2). Providers can submit offers and track award status.
          </p>
        </div>

        {canSync && (
          <button
            onClick={doSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-3 py-2 rounded bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-60"
          >
            <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
            Sync Group2
          </button>
        )}
      </div>

      <div className="grid gap-6">
        {sorted.map((c) => {
          const awardedToMe = Boolean((c as any).isAwardedToMyProvider);

          const cfg = (c as any).allowedConfiguration;
          const acceptedTypesCount = Array.isArray(cfg?.acceptedServiceRequestTypes)
            ? cfg.acceptedServiceRequestTypes.filter((x: any) => x?.isAccepted).length
            : 0;

          return (
            <div key={(c as any).contractId} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <FileCheck size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg text-gray-900">{(c as any).title}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {(c as any).contractId} • {(c as any).kind}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge status={(c as any).status} />
                </div>
              </div>

              {/* Award banner (isolation-safe) */}
              {(c as any).isAwardedToMyProvider && (
                <div className="rounded-lg border p-3 mb-4 bg-green-50 border-green-200">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-green-600" />
                    <p className="text-sm text-green-900">
                      <strong>Award:</strong> Awarded to your provider ({(c as any).myProviderStatus?.status || "Active"})
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500">Publishing Date</p>
                  <p className="text-sm text-gray-900 mt-1">
                    {(c as any).publishingDate ? new Date((c as any).publishingDate).toLocaleDateString() : "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Offer Deadline</p>
                  <p className="text-sm text-gray-900 mt-1">
                    {(c as any).offerDeadlineAt ? new Date((c as any).offerDeadlineAt).toLocaleString() : "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Request Rules</p>
                  <p className="text-sm text-gray-900 mt-1">{acceptedTypesCount} types</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="text-sm text-gray-900 mt-1">{String((c as any).status)}</p>
                </div>
              </div>

              {(c as any).scopeOfWork && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">Scope of Work</p>
                  <p className="text-sm text-gray-700 line-clamp-3 whitespace-pre-line">{(c as any).scopeOfWork}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  {awardedToMe ? "Awarded to your provider" : "Visible to all providers"}
                </div>

                <Link to={`/contracts/${encodeURIComponent((c as any).contractId)}`} className="text-sm text-blue-600 hover:text-blue-700">
                  View Details →
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ContractsPage;
