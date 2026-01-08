import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge";
import { Search } from "lucide-react";
import { useApp } from "../context/AppContext";
import { getServiceOffers } from "../api/serviceOffers";
import type { ServiceOffer } from "../api/serviceOffers";
import { getServiceRequests } from "../api/serviceRequests";
import { getSpecialists } from "../api/specialists";

export const ServiceOffersPage: React.FC = () => {
  const { tokens, currentProvider } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const [rows, setRows] = useState<ServiceOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // for nicer table labels (optional)
  const [requestTitleById, setRequestTitleById] = useState<Record<string, string>>({});
  const [specialistNameById, setSpecialistNameById] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!tokens?.access) return;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const offers = await getServiceOffers(tokens.access);
        setRows(offers);

        // Optional: map request titles + specialist names
        const [reqs, specs] = await Promise.all([
          getServiceRequests(tokens.access),
          getSpecialists(tokens.access),
        ]);

        setRequestTitleById(
          Object.fromEntries(reqs.map((r: any) => [r.id, r.title]))
        );

        const filteredSpecs = specs.filter((s: any) => s.providerId === currentProvider?.id);
        setSpecialistNameById(
          Object.fromEntries(filteredSpecs.map((s: any) => [s.id, s.name]))
        );
      } catch (e: any) {
        setError(e?.message || "Failed to load service offers");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [tokens?.access, currentProvider?.id]);

  const filtered = useMemo(() => {
    const t = searchTerm.toLowerCase();
    return rows.filter((o) => {
      const reqTitle = (requestTitleById[o.serviceRequestId] || "").toLowerCase();
      const specName = (specialistNameById[o.specialistId] || "").toLowerCase();
      return (
        String(o.id).toLowerCase().includes(t) ||
        o.serviceRequestId.toLowerCase().includes(t) ||
        reqTitle.includes(t) ||
        specName.includes(t)
      );
    });
  }, [rows, searchTerm, requestTitleById, specialistNameById]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl text-gray-900">Service Offers</h1>
          <p className="text-gray-500 mt-1">
            Provider responses to service requests (Draft → Submitted → Withdrawn)
          </p>
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
                  <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Specialist</th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Daily Rate</th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Total Cost</th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Match</th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filtered.map((offer) => (
                  <tr key={offer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{offer.id}</td>

                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {requestTitleById[offer.serviceRequestId] || "N/A"}
                      </div>
                      <div className="text-xs text-gray-500">{offer.serviceRequestId}</div>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-700">
                      {specialistNameById[offer.specialistId] || offer.specialistId}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-900">€{offer.daily_rate}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">€{Number(offer.total_cost).toLocaleString()}</td>

                    <td className="px-6 py-4">
                      <div className="text-xs">
                        <div className="text-gray-700">Must: {offer.mustHaveMatchPercentage ?? "-"}%</div>
                        <div className="text-gray-500">Nice: {offer.niceToHaveMatchPercentage ?? "-"}%</div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <StatusBadge status={offer.status} />
                    </td>

                    <td className="px-6 py-4">
                      <Link to={`/service-offers/${offer.id}`} className="text-sm text-blue-600 hover:text-blue-700">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="p-8 text-center text-gray-500">No service offers found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ServiceOffersPage;
