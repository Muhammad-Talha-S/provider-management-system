import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileCheck, Calendar, Building2 } from "lucide-react";

import { StatusBadge } from "../components/StatusBadge";
import { useApp } from "../context/AppContext";
import { getContracts } from "../api/contracts";
import type { Contract } from "../api/contracts";

export const ContractsPage: React.FC = () => {
  const { tokens, currentProvider } = useApp();
  const access = tokens?.access || "";

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const providerId = currentProvider?.id;

  useEffect(() => {
    const run = async () => {
      if (!access) return;
      setLoading(true);
      setError("");
      try {
        const data = await getContracts(access);
        setContracts(data);
      } catch (e: any) {
        setError(e?.message || "Failed to load contracts");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [access]);

  const sorted = useMemo(() => {
    // Published/In Negotiation first, then Active/Awarded, etc.
    const rank = (s: string) => {
      const order = ["Published", "In Negotiation", "Awarded", "Active", "Expired", "Draft"];
      const idx = order.indexOf(s);
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
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl text-gray-900">Contracts</h1>
        <p className="text-gray-500 mt-1">
          Published contracts from Contract Management (Group 2). Providers can submit offers and track award status.
        </p>
      </div>

      <div className="grid gap-6">
        {sorted.map((c) => {
          const awardedToMe = !!c.awardedProviderId && !!providerId && c.awardedProviderId === providerId;

          return (
            <div key={c.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <FileCheck size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg text-gray-900">{c.title}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {c.id} • {c.kind}
                      {c.awardedProviderId ? ` • Awarded: ${c.awardedProviderId}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge status={c.status} />
                </div>
              </div>

              {/* Award banner (Milestone 3) */}
              {c.awardedProviderId && (
                <div
                  className={`rounded-lg border p-3 mb-4 ${
                    awardedToMe ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className={awardedToMe ? "text-green-600" : "text-yellow-600"} />
                    <p className={`text-sm ${awardedToMe ? "text-green-900" : "text-yellow-900"}`}>
                      <strong>Awarded Provider:</strong> {c.awardedProviderId}
                      {awardedToMe ? " (your provider)" : ""}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500">Published</p>
                  <p className="text-sm text-gray-900 mt-1">
                    {c.publishedAt ? new Date(c.publishedAt).toLocaleString() : "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Contract Period</p>
                  <p className="text-sm text-gray-900 mt-1">
                    {c.startDate || "—"} - {c.endDate || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Request Rules</p>
                  <p className="text-sm text-gray-900 mt-1">
                    {c.allowedRequestConfigs ? Object.keys(c.allowedRequestConfigs).length : 0} types
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="text-sm text-gray-900 mt-1">{c.status}</p>
                </div>
              </div>

              {c.scopeOfWork && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">Scope of Work</p>
                  <p className="text-sm text-gray-700 line-clamp-3 whitespace-pre-line">{c.scopeOfWork}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  {c.awardedProviderId
                    ? awardedToMe
                      ? "Awarded to your provider"
                      : "Awarded to another provider"
                    : "Open for provider offers"}
                </div>

                <Link to={`/contracts/${c.id}`} className="text-sm text-blue-600 hover:text-blue-700">
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
