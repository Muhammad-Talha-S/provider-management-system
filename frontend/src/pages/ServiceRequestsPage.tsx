// src/pages/ServiceRequestsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge";
import { Search, Filter, Calendar, MapPin, Clock, RefreshCw } from "lucide-react";
import { useApp } from "../context/AppContext";
import { getServiceRequests, syncServiceRequestsFromGroup3 } from "../api/serviceRequests";

function parseDt(v?: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDt(v?: string | null): string {
  const d = parseDt(v);
  if (!d) return "-";
  return d.toLocaleString();
}

function countdown(deadline?: string | null): { text: string; isExpired: boolean } {
  const d = parseDt(deadline);
  if (!d) return { text: "No deadline", isExpired: false };

  const diffMs = d.getTime() - Date.now();
  if (diffMs <= 0) return { text: "Expired", isExpired: true };

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const mins = totalMinutes % 60;

  if (days > 0) return { text: `${days}d ${hours}h left`, isExpired: false };
  if (hours > 0) return { text: `${hours}h ${mins}m left`, isExpired: false };
  return { text: `${mins}m left`, isExpired: false };
}

function safeArr<T>(v: any): T[] {
  return Array.isArray(v) ? v : [];
}

function getPrimaryRoleLabel(req: any): string {
  const roles = safeArr<any>(req?.roles);
  if (!roles.length) return "-";
  const r = roles[0];
  const roleName = r?.roleName || r?.role || "-";
  const tech = r?.technology ? ` (${r.technology})` : "";
  return `${roleName}${tech}`;
}

function getTotalManDays(req: any): number {
  const roles = safeArr<any>(req?.roles);
  if (!roles.length) return 0;
  return roles.reduce((sum, r) => sum + (Number(r?.manDays) || 0), 0);
}

function getTotalOnsiteDays(req: any): number {
  const roles = safeArr<any>(req?.roles);
  if (!roles.length) return 0;
  return roles.reduce((sum, r) => sum + (Number(r?.onsiteDays) || 0), 0);
}

export const ServiceRequestsPage: React.FC = () => {
  const { tokens, currentUser } = useApp();
  const access = tokens?.access || "";

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isBlockedRole = currentUser?.role === "Contract Coordinator";
  const canSync =
    currentUser?.role === "Provider Admin" || currentUser?.role === "Supplier Representative";

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getServiceRequests(access);
      setRows(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load service requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!access) return;
    if (isBlockedRole) {
      setError("You do not have access to Service Requests.");
      setLoading(false);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access, isBlockedRole]);

  const doSync = async () => {
    if (!access) return;
    setSyncing(true);
    setError(null);
    try {
      const res = await syncServiceRequestsFromGroup3(access);
      await load();
      alert(`Synced from Group 3. Upserted: ${res.upserted}`);
    } catch (e: any) {
      setError(e?.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  // Build status options from data (so filters match reality)
  const statusOptions = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => {
      if (r?.status) s.add(String(r.status));
    });
    return Array.from(s).sort();
  }, [rows]);

  const filteredRequests = useMemo(() => {
    const t = searchTerm.toLowerCase();
    return rows.filter((req) => {
      const id = String(req?.id || req?.requestNumber || "").toLowerCase();
      const title = String(req?.title || "").toLowerCase();
      const roleLabel = getPrimaryRoleLabel(req).toLowerCase();

      const matchesSearch = !t || title.includes(t) || id.includes(t) || roleLabel.includes(t);
      const matchesStatus = statusFilter === "all" || String(req?.status) === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [rows, searchTerm, statusFilter]);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl text-gray-900">Service Requests</h1>
          <p className="text-gray-500 mt-1">
            Service requests published by Service Management (Group 3) for provider bidding
          </p>
        </div>

        {canSync && (
          <button
            onClick={doSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-3 py-2 rounded bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-60"
          >
            <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
            Sync Group3
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search
              size={20}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading && <div className="text-gray-600">Loading service requests...</div>}
      {error && !loading && <div className="text-red-600">{error}</div>}

      {!loading && !error && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">
                    Request ID
                  </th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">
                    Role(s)
                  </th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">
                    Bidding Deadline
                  </th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filteredRequests.map((req) => {
                  const id = String(req?.id || req?.requestNumber);
                  const deadline = req?.biddingEndAt || req?.bidding_end_at || null;
                  const cd = countdown(deadline);

                  return (
                    <tr key={id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{id}</td>

                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{req?.title || "-"}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Contract: {req?.contractId || req?.contract_id || "-"}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-700">
                        {getPrimaryRoleLabel(req)}
                        <div className="text-xs text-gray-500 mt-1">
                          {safeArr<any>(req?.roles).length > 1
                            ? `+${safeArr<any>(req?.roles).length - 1} more`
                            : ""}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-xs text-gray-700">
                          {req?.type || "-"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-700">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-gray-400" />
                          {getTotalManDays(req)} md ({getTotalOnsiteDays(req)} onsite)
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-700">
                          <MapPin size={14} className="text-gray-400" />
                          {req?.performanceLocation || req?.performance_location || "-"}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{formatDt(deadline)}</div>
                        <div
                          className={`text-xs mt-1 inline-flex items-center gap-1 ${
                            cd.isExpired ? "text-red-600" : "text-gray-500"
                          }`}
                        >
                          <Clock size={12} className={cd.isExpired ? "text-red-500" : "text-gray-400"} />
                          {cd.text}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={String(req?.status || "-")} />
                      </td>

                      <td className="px-6 py-4">
                        <Link
                          to={`/service-requests/${encodeURIComponent(id)}`}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredRequests.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No service requests found matching your criteria
              <div className="text-xs mt-2">
                Tip: click <b>Sync Group3</b> (top right) to import requests.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ServiceRequestsPage;
