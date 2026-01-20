// src/pages/ServiceOffersPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge";
import { Search } from "lucide-react";
import { useApp } from "../context/AppContext";
import { getServiceOffers } from "../api/serviceOffers";

export const ServiceOffersPage: React.FC = () => {
  const { tokens } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tokens?.access) return;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const offers = await getServiceOffers(tokens.access);
        setRows(offers as any);
      } catch (e: any) {
        setError(e?.message || "Failed to load service offers");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [tokens?.access]);

  const filtered = useMemo(() => {
    const t = searchTerm.toLowerCase();
    return rows.filter((o) => {
      const sr = o.serviceRequest || {};
      const reqNo = String(sr.requestNumber || "").toLowerCase();
      const title = String(sr.title || "").toLowerCase();

      const specs = Array.isArray(o.specialists) ? o.specialists : [];
      const specNames = specs.map((s: any) => String(s?.name || "")).join(" ").toLowerCase();

      return (
        String(o.id).toLowerCase().includes(t) ||
        reqNo.includes(t) ||
        title.includes(t) ||
        specNames.includes(t)
      );
    });
  }, [rows, searchTerm]);

  const specialistsLabel = (offer: any) => {
    const specs = Array.isArray(offer.specialists) ? offer.specialists : [];
    if (specs.length === 0) return "-";
    if (specs.length === 1) return specs[0]?.name || specs[0]?.userId || "-";
    return `${specs.length} specialists`;
  };

  const totalCostLabel = (offer: any) => {
    const v = offer.totalCost;
    if (v == null) return "-";
    const n = Number(v);
    return Number.isFinite(n) ? `€${n.toLocaleString()}` : String(v);
  };

  const statusLabel = (offer: any) => offer.offerStatus || offer.status || "DRAFT";

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl text-gray-900">Service Offers</h1>
          <p className="text-gray-500 mt-1">Draft → Submitted → (Accepted / Rejected)</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="relative">
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search offers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {loading && <div className="text-gray-600">Loading offers...</div>}
      {error && !loading && <div className="text-red-600">{error}</div>}

      {!loading && !error && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Offer ID</th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Service Request</th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Specialists</th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Total Cost</th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filtered.map((offer: any) => {
                  const sr = offer.serviceRequest || {};
                  return (
                    <tr key={offer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{offer.id}</td>

                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{sr.title || "N/A"}</div>
                        <div className="text-xs text-gray-500">{sr.requestNumber || "-"}</div>
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-700">{specialistsLabel(offer)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{totalCostLabel(offer)}</td>

                      <td className="px-6 py-4">
                        <StatusBadge status={statusLabel(offer)} />
                      </td>

                      <td className="px-6 py-4">
                        <Link to={`/service-offers/${offer.id}`} className="text-sm text-blue-600 hover:text-blue-700">
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && <div className="p-8 text-center text-gray-500">No service offers found</div>}
        </div>
      )}
    </div>
  );
};

export default ServiceOffersPage;
