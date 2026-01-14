import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge";
import { Search, Filter, Calendar, MapPin, Clock } from "lucide-react";
import { useApp } from "../context/AppContext";
import { getServiceRequests } from "../api/serviceRequests";

function parseDeadline(deadline?: string | null): Date | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDeadline(deadline?: string | null): string {
  const d = parseDeadline(deadline);
  if (!d) return "-";
  return d.toLocaleString(); // uses browser locale/timezone
}

function getCountdownText(deadline?: string | null): { text: string; isExpired: boolean } {
  const d = parseDeadline(deadline);
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

export const ServiceRequestsPage: React.FC = () => {
  const { tokens, currentUser } = useApp();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Role restriction: Contract Coordinator should not access this page
  useEffect(() => {
    if (currentUser?.role === "Contract Coordinator") {
      setError("You do not have access to Service Requests.");
      setLoading(false);
      return;
    }
  }, [currentUser?.role]);

  useEffect(() => {
    if (!tokens?.access) return;
    if (currentUser?.role === "Contract Coordinator") return;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getServiceRequests(tokens.access);
        setRows(data);
      } catch (e: any) {
        setError(e?.message || "Failed to load service requests");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [tokens?.access, statusFilter, currentUser?.role]);

  const filteredRequests = useMemo(() => {
    return rows.filter((request) => {
      const matchesSearch =
        request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.role.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || request.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [rows, searchTerm, statusFilter]);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl text-gray-900">Service Requests</h1>
        <p className="text-gray-500 mt-1">
          Service requests published by Service Management (Group 3) for provider bidding
        </p>
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
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      {loading && <div className="text-gray-600">Loading service requests...</div>}
      {error && !loading && <div className="text-red-600">{error}</div>}

      {/* Requests Table */}
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
                    Role
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
                    Offer Deadline
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
                {filteredRequests.map((request) => {
                  const countdown = getCountdownText(request.offerDeadlineAt);
                  return (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{request.id}</td>

                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{request.title}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Contract: {request.linkedContractId || "N/A"}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-700">{request.role}</td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-xs text-gray-700">
                          {request.type}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-700">
                        <div className="flex items-center gap-1">
                          <Calendar size={14} className="text-gray-400" />
                          {request.totalManDays} days
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-700">
                          <MapPin size={14} className="text-gray-400" />
                          {request.performanceLocation}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {formatDeadline(request.offerDeadlineAt)}
                        </div>
                        <div
                          className={`text-xs mt-1 inline-flex items-center gap-1 ${
                            countdown.isExpired ? "text-red-600" : "text-gray-500"
                          }`}
                        >
                          <Clock size={12} className={countdown.isExpired ? "text-red-500" : "text-gray-400"} />
                          {countdown.text}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={request.status} />
                      </td>

                      <td className="px-6 py-4">
                        <Link
                          to={`/service-requests/${request.id}`}
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
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ServiceRequestsPage;
