import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Send, Package, Users, FileCheck, Activity, RefreshCw } from "lucide-react";

import { useApp } from "../context/AppContext";
import { StatusBadge } from "../components/StatusBadge";

import type { Contract, ServiceOffer, ServiceOrder, ServiceRequest, Provider } from "../types";

import { getServiceRequests, syncServiceRequestsFromGroup3 } from "../api/serviceRequests";
import { getServiceOffers } from "../api/serviceOffers";
import { getServiceOrders } from "../api/serviceOrders";
import { getSpecialists } from "../api/specialists";
import { getContracts, syncContractsFromGroup2 } from "../api/contracts";
import { getMyProvider } from "../api/providers";

type StatCard = {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ size?: number }>;
  color: string;
  link: string;
};

function isOpenForBidding(sr: ServiceRequest): boolean {
  // Group3 example: "APPROVED_FOR_BIDDING"
  // Also treat biddingActive=true as open.
  return sr.status === "APPROVED_FOR_BIDDING" || Boolean(sr.biddingActive);
}

function isPendingOffer(offer: ServiceOffer): boolean {
  return offer.status === "SUBMITTED";
}

function isActiveOrder(order: ServiceOrder): boolean {
  return order.status === "ACTIVE";
}

function providerProfileCompleteness(provider: Provider): { percent: number; missing: string[] } {
  const missing: string[] = [];

  if (!provider.name) missing.push("name");
  if (!provider.contactName) missing.push("contactName");
  if (!provider.contactEmail) missing.push("contactEmail");
  if (!provider.contactPhone) missing.push("contactPhone");
  if (!provider.address) missing.push("address");

  const total = 5;
  const filled = total - missing.length;
  const percent = Math.round((filled / total) * 100);

  return { percent, missing };
}

export const Dashboard: React.FC = () => {
  const { currentUser, tokens } = useApp();
  const access = tokens?.access;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // Data buckets (only some are used per role)
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [serviceOffers, setServiceOffers] = useState<ServiceOffer[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [specialistCountAvailable, setSpecialistCountAvailable] = useState<number>(0);
  const [provider, setProvider] = useState<Provider | null>(null);

  const [syncingGroup3, setSyncingGroup3] = useState(false);
  const [syncingGroup2, setSyncingGroup2] = useState(false);

  const role = currentUser?.role;

  useEffect(() => {
    const load = async () => {
      if (!access || !currentUser) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        // Load only what each role needs
        if (role === "Supplier Representative") {
          const [srs, offers, orders, specialists] = await Promise.all([
            getServiceRequests(access),
            getServiceOffers(access),
            getServiceOrders(access), // MUST return types.ts ServiceOrder[]
            getSpecialists(access),
          ]);

          setServiceRequests(srs);
          setServiceOffers(offers);
          setServiceOrders(orders);

          setSpecialistCountAvailable(
            (specialists || []).filter((s: any) => s.availability === "Available").length
          );
        } else if (role === "Specialist") {
          const orders = await getServiceOrders(access);
          setServiceOrders(orders);
        } else if (role === "Contract Coordinator") {
          const cs = await getContracts(access);
          setContracts(cs);
        } else if (role === "Provider Admin") {
          const prov = await getMyProvider(access);
          setProvider(prov);
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [access, currentUser, role]);

  const supplierStats: StatCard[] = useMemo(() => {
    const openSR = serviceRequests.filter(isOpenForBidding).length;
    const pending = serviceOffers.filter(isPendingOffer).length;
    const active = serviceOrders.filter(isActiveOrder).length;

    return [
      {
        label: "Open Service Requests",
        value: openSR,
        icon: FileText,
        color: "bg-blue-50 text-blue-600",
        link: "/service-requests",
      },
      {
        label: "Pending Offers",
        value: pending,
        icon: Send,
        color: "bg-yellow-50 text-yellow-600",
        link: "/service-offers",
      },
      {
        label: "Active Orders",
        value: active,
        icon: Package,
        color: "bg-green-50 text-green-600",
        link: "/service-orders",
      },
      {
        label: "Available Specialists",
        value: specialistCountAvailable,
        icon: Users,
        color: "bg-purple-50 text-purple-600",
        link: "/specialists",
      },
    ];
  }, [serviceRequests, serviceOffers, serviceOrders, specialistCountAvailable]);

  const specialistStats: StatCard[] = useMemo(() => {
    const active = serviceOrders.filter(isActiveOrder).length;
    const completed = serviceOrders.filter((o) => o.status === "COMPLETED").length;

    return [
      {
        label: "My Active Orders",
        value: active,
        icon: Package,
        color: "bg-green-50 text-green-600",
        link: "/my-orders",
      },
      {
        label: "My Completed Orders",
        value: completed,
        icon: Package,
        color: "bg-gray-50 text-gray-700",
        link: "/my-orders",
      },
      {
        label: "My Profile",
        value: "View",
        icon: Users,
        color: "bg-blue-50 text-blue-600",
        link: currentUser ? `/specialists/${currentUser.id}` : "/specialists",
      },
    ];
  }, [serviceOrders, currentUser]);

  const coordinatorStats: StatCard[] = useMemo(() => {
    const published = contracts.filter((c) => c.status === "PUBLISHED").length;
    const negotiation = contracts.filter((c) => c.status === "IN_NEGOTIATION").length;
    const active = contracts.filter((c) => c.status === "ACTIVE").length;

    return [
      {
        label: "Published Contracts",
        value: published,
        icon: FileCheck,
        color: "bg-blue-50 text-blue-600",
        link: "/contracts",
      },
      {
        label: "In Negotiation",
        value: negotiation,
        icon: FileCheck,
        color: "bg-yellow-50 text-yellow-600",
        link: "/contracts",
      },
      {
        label: "Active Contracts",
        value: active,
        icon: FileCheck,
        color: "bg-green-50 text-green-600",
        link: "/contracts",
      },
    ];
  }, [contracts]);

  const adminStats: StatCard[] = useMemo(() => {
    const completeness = provider ? providerProfileCompleteness(provider) : { percent: 0, missing: ["loading"] };

    return [
      {
        label: "Provider Profile",
        value: `${completeness.percent}%`,
        icon: Users,
        color: "bg-blue-50 text-blue-600",
        link: "/provider",
      },
      {
        label: "Activity Log",
        value: "View",
        icon: Activity,
        color: "bg-gray-50 text-gray-700",
        link: "/activity-log",
      },
    ];
  }, [provider]);

  const openServiceRequests = useMemo(() => {
    return serviceRequests.filter(isOpenForBidding).slice(0, 5);
  }, [serviceRequests]);

  const recentOffers = useMemo(() => {
    return serviceOffers.slice(0, 5);
  }, [serviceOffers]);

  const myOrdersPreview = useMemo(() => {
    return serviceOrders.slice(0, 5);
  }, [serviceOrders]);

  const recentContracts = useMemo(() => {
    return contracts.slice(0, 5);
  }, [contracts]);

  const title = useMemo(() => {
    if (!currentUser) return "Dashboard";
    if (role === "Supplier Representative") return "Supplier Dashboard";
    if (role === "Contract Coordinator") return "Contract Coordinator Dashboard";
    if (role === "Specialist") return "Specialist Dashboard";
    if (role === "Provider Admin") return "Provider Admin Dashboard";
    return "Dashboard";
  }, [currentUser, role]);

  const handleSyncGroup3 = async () => {
    if (!access) return;

    setSyncingGroup3(true);
    setError("");

    try {
      await syncServiceRequestsFromGroup3(access);
      const srs = await getServiceRequests(access);
      setServiceRequests(srs);
    } catch (e: any) {
      setError(e?.message || "Group3 sync failed.");
    } finally {
      setSyncingGroup3(false);
    }
  };

  const handleSyncGroup2 = async () => {
    if (!access) return;

    setSyncingGroup2(true);
    setError("");

    try {
      await syncContractsFromGroup2(access);
      const cs = await getContracts(access);
      setContracts(cs);
    } catch (e: any) {
      setError(e?.message || "Group2 sync failed.");
    } finally {
      setSyncingGroup2(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="p-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-gray-600">
          Please login to view the dashboard.
        </div>
      </div>
    );
  }

  const statsForRole =
    role === "Supplier Representative"
      ? supplierStats
      : role === "Specialist"
      ? specialistStats
      : role === "Contract Coordinator"
      ? coordinatorStats
      : role === "Provider Admin"
      ? adminStats
      : [];

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl text-gray-900">Welcome back, {currentUser.name}</h1>
          <p className="text-gray-500 mt-1">{title}</p>
        </div>

        {/* Optional sync buttons */}
        <div className="flex gap-2">
          {role === "Supplier Representative" && (
            <button
              type="button"
              onClick={handleSyncGroup3}
              disabled={syncingGroup3}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-60"
              title="Sync Service Requests from Group 3"
            >
              <RefreshCw size={16} />
              {syncingGroup3 ? "Syncing..." : "Sync Group3"}
            </button>
          )}

          {role === "Contract Coordinator" && (
            <button
              type="button"
              onClick={handleSyncGroup2}
              disabled={syncingGroup2}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-60"
              title="Sync Contracts from Group 2"
            >
              <RefreshCw size={16} />
              {syncingGroup2 ? "Syncing..." : "Sync Group2"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-gray-600">Loading dashboard...</div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statsForRole.map((stat) => {
              const Icon = stat.icon;
              return (
                <Link
                  key={stat.label}
                  to={stat.link}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">{stat.label}</p>
                      <p className="text-3xl text-gray-900 mt-2">{stat.value}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center`}>
                      <Icon size={24} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Role-specific content */}
          {role === "Supplier Representative" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Open Service Requests */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg text-gray-900">Open Service Requests</h2>
                </div>

                <div className="divide-y divide-gray-200">
                  {openServiceRequests.length > 0 ? (
                    openServiceRequests.map((sr) => (
                      <Link
                        key={sr.id}
                        to={`/service-requests/${sr.id}`}
                        className="p-6 hover:bg-gray-50 transition-colors block"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="text-sm text-gray-900">{sr.title}</h3>
                            <p className="text-xs text-gray-500 mt-1">{sr.requestNumber}</p>
                          </div>
                          <StatusBadge status={sr.status} />
                        </div>

                        <div className="text-xs text-gray-500 mt-2">
                          Type: {sr.type} • Contract: {sr.contractId}
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="p-6 text-center text-gray-500 text-sm">No open service requests</div>
                  )}
                </div>

                <div className="p-4 border-t border-gray-200">
                  <Link to="/service-requests" className="text-sm text-blue-600 hover:text-blue-700">
                    View all requests →
                  </Link>
                </div>
              </div>

              {/* Recent Offers */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg text-gray-900">Recent Service Offers</h2>
                </div>

                <div className="divide-y divide-gray-200">
                  {recentOffers.length > 0 ? (
                    recentOffers.map((offer) => (
                      <Link
                        key={offer.id}
                        to={`/service-offers/${offer.id}`}
                        className="p-6 hover:bg-gray-50 transition-colors block"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="text-sm text-gray-900">Offer #{offer.id}</h3>
                            <p className="text-xs text-gray-500 mt-1">Request: {offer.serviceRequestId}</p>
                          </div>
                          <StatusBadge status={offer.status} />
                        </div>

                        <div className="text-xs text-gray-500 mt-2">Provider: {offer.providerId}</div>
                      </Link>
                    ))
                  ) : (
                    <div className="p-6 text-center text-gray-500 text-sm">No recent offers</div>
                  )}
                </div>

                <div className="p-4 border-t border-gray-200">
                  <Link to="/service-offers" className="text-sm text-blue-600 hover:text-blue-700">
                    View all offers →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {role === "Specialist" && (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg text-gray-900">My Orders</h2>
              </div>

              <div className="divide-y divide-gray-200">
                {myOrdersPreview.length > 0 ? (
                  myOrdersPreview.map((o) => (
                    <Link
                      key={o.id}
                      to={`/service-orders/${o.id}`}
                      className="p-6 hover:bg-gray-50 transition-colors block"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="text-sm text-gray-900">Order #{o.id}</h3>
                          <p className="text-xs text-gray-500 mt-1">Request: {o.serviceRequestId}</p>
                        </div>
                        <StatusBadge status={o.status} />
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        Provider: {o.providerId} • Total: €{Number(o.totalCost || 0).toLocaleString()}
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="p-6 text-center text-gray-500 text-sm">No orders assigned yet</div>
                )}
              </div>

              <div className="p-4 border-t border-gray-200">
                <Link to="/my-orders" className="text-sm text-blue-600 hover:text-blue-700">
                  View all my orders →
                </Link>
              </div>
            </div>
          )}

          {role === "Contract Coordinator" && (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg text-gray-900">Recent Contracts</h2>
              </div>

              <div className="divide-y divide-gray-200">
                {recentContracts.length > 0 ? (
                  recentContracts.map((c) => (
                    <Link
                      key={c.contractId}
                      to={`/contracts/${c.contractId}`}
                      className="p-6 hover:bg-gray-50 transition-colors block"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="text-sm text-gray-900">{c.title}</h3>
                          <p className="text-xs text-gray-500 mt-1">{c.contractId}</p>
                        </div>
                        <StatusBadge status={c.status} />
                      </div>
                      <div className="text-xs text-gray-500 mt-2">Kind: {c.kind}</div>
                    </Link>
                  ))
                ) : (
                  <div className="p-6 text-center text-gray-500 text-sm">No contracts available</div>
                )}
              </div>

              <div className="p-4 border-t border-gray-200">
                <Link to="/contracts" className="text-sm text-blue-600 hover:text-blue-700">
                  View all contracts →
                </Link>
              </div>
            </div>
          )}

          {role === "Provider Admin" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg text-gray-900">Compliance Snapshot</h2>
                </div>

                <div className="p-6">
                  {provider ? (
                    <>
                      {(() => {
                        const c = providerProfileCompleteness(provider);
                        return (
                          <>
                            <div className="text-sm text-gray-700">
                              Provider profile completeness: <span className="font-semibold">{c.percent}%</span>
                            </div>
                            {c.missing.length > 0 ? (
                              <div className="mt-2 text-xs text-gray-500">Missing: {c.missing.join(", ")}</div>
                            ) : (
                              <div className="mt-2 text-xs text-green-700">
                                All required provider fields are filled.
                              </div>
                            )}
                          </>
                        );
                      })()}
                      <div className="mt-4 flex gap-3">
                        <Link to="/provider" className="text-sm text-blue-600 hover:text-blue-700">
                          Update provider →
                        </Link>
                        <Link to="/activity-log" className="text-sm text-blue-600 hover:text-blue-700">
                          View activity log →
                        </Link>
                      </div>
                      <div className="mt-3 text-xs text-gray-500">
                        Next: inactive users + role coverage once we add an admin users list endpoint.
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-gray-600">Provider data not available.</div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg text-gray-900">Quick Links</h2>
                </div>

                <div className="p-6 space-y-3 text-sm">
                  <Link to="/specialists" className="flex items-center gap-2 text-gray-700 hover:text-gray-900">
                    <Users size={18} /> Users
                  </Link>
                  <Link to="/contracts" className="flex items-center gap-2 text-gray-700 hover:text-gray-900">
                    <FileCheck size={18} /> Contracts
                  </Link>
                  <Link to="/service-orders" className="flex items-center gap-2 text-gray-700 hover:text-gray-900">
                    <Package size={18} /> Service Orders
                  </Link>
                  <Link to="/activity-log" className="flex items-center gap-2 text-gray-700 hover:text-gray-900">
                    <Activity size={18} /> Activity Log
                  </Link>
                </div>
              </div>
            </div>
          )}

          {!role && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 text-gray-600">
              No role found for current user.
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
