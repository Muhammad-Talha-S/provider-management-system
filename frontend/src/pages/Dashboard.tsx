// frontend/src/pages/Dashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Send,
  Package,
  Users,
  FileCheck,
  Activity,
  RefreshCw,
  Building2,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

import { useApp } from "../context/AppContext";
import { StatusBadge } from "../components/StatusBadge";

import type { Contract, ServiceOffer, ServiceOrder, ServiceRequest, Provider } from "../types";

import { getServiceRequests } from "../api/serviceRequests";
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
  return sr.status === "APPROVED_FOR_BIDDING" || Boolean((sr as any)?.biddingActive);
}

function providerProfileCompleteness(provider: Provider) {
  const required: Array<keyof Provider> = ["name", "contactName", "contactEmail", "contactPhone", "address"];
  const missing = required.filter((k) => !provider[k]);
  const percent = Math.round(((required.length - missing.length) / required.length) * 100);
  return { percent, missing };
}

function safeStr(v: any, fallback = "—") {
  const s = String(v ?? "").trim();
  return s ? s : fallback;
}

function moneyLabel(v: any) {
  if (v == null) return "€0";
  const n = Number(v);
  if (Number.isFinite(n)) return `€${n.toLocaleString()}`;
  return `€${String(v)}`;
}

export const Dashboard: React.FC = () => {
  const { currentUser, tokens } = useApp();
  const access = tokens?.access || "";
  const role = currentUser?.role;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [serviceOffers, setServiceOffers] = useState<ServiceOffer[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [availableSpecialists, setAvailableSpecialists] = useState(0);

  const [syncingG2, setSyncingG2] = useState(false);

  const shouldLoadProviderInfo = role === "Provider Admin" || role === "Supplier Representative" || role === "Contract Coordinator";
  //const shouldLoadSupplierData = role === "Provider Admin" || role === "Supplier Representative";
  //const shouldLoadContracts = role === "Provider Admin" || role === "Contract Coordinator";
  //const shouldLoadOrders = role === "Provider Admin" || role === "Supplier Representative" || role === "Specialist";

  useEffect(() => {
    if (!access || !currentUser) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        // Load provider info for Provider Admin + Supplier Rep + Contract Coordinator
        if (shouldLoadProviderInfo) {
          const p = await getMyProvider(access);
          setProvider(p);
        } else {
          setProvider(null);
        }

        // Supplier Representative: SR + Offers + Orders (+ specialists for available count)
        if (role === "Supplier Representative") {
          const [srs, offers, orders, specialists] = await Promise.all([
            getServiceRequests(access),
            getServiceOffers(access),
            getServiceOrders(access),
            getSpecialists(access),
          ]);
          setServiceRequests(srs);
          setServiceOffers(offers);
          setServiceOrders(orders);
          setContracts([]); // ensure coordinator-only data isn't shown
          setAvailableSpecialists(
            (specialists || []).filter((s: any) => s?.availability === "Available").length
          );
          return;
        }

        // Contract Coordinator: ONLY contracts
        if (role === "Contract Coordinator") {
          const cs = await getContracts(access);
          setContracts(cs);
          setServiceRequests([]);
          setServiceOffers([]);
          setServiceOrders([]);
          setAvailableSpecialists(0);
          return;
        }

        // Specialist: only orders
        if (role === "Specialist") {
          const orders = await getServiceOrders(access);
          setServiceOrders(orders);
          setServiceRequests([]);
          setServiceOffers([]);
          setContracts([]);
          setAvailableSpecialists(0);
          return;
        }

        // Provider Admin: load everything (overview)
        if (role === "Provider Admin") {
          const [cs, srs, offers, orders] = await Promise.all([
            getContracts(access),
            getServiceRequests(access),
            getServiceOffers(access),
            getServiceOrders(access),
          ]);
          setContracts(cs);
          setServiceRequests(srs);
          setServiceOffers(offers);
          setServiceOrders(orders);
          setAvailableSpecialists(0);
          return;
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access, currentUser, role]);

  /* -------------------- stats per role -------------------- */

  const supplierStats: StatCard[] = useMemo(() => {
    return [
      {
        label: "Open Service Requests",
        value: serviceRequests.filter(isOpenForBidding).length,
        icon: FileText,
        color: "bg-blue-50 text-blue-600",
        link: "/service-requests",
      },
      {
        label: "Pending Offers",
        value: serviceOffers.filter((o: any) => o?.offerStatus === "SUBMITTED" || o?.status === "SUBMITTED").length,
        icon: Send,
        color: "bg-yellow-50 text-yellow-600",
        link: "/service-offers",
      },
      {
        label: "Active Orders",
        value: serviceOrders.filter((o) => o.status === "ACTIVE").length,
        icon: Package,
        color: "bg-green-50 text-green-600",
        link: "/service-orders",
      },
      {
        label: "Available Specialists",
        value: availableSpecialists,
        icon: Users,
        color: "bg-purple-50 text-purple-600",
        link: "/specialists",
      },
    ];
  }, [serviceRequests, serviceOffers, serviceOrders, availableSpecialists]);

  const adminStats: StatCard[] = useMemo(() => {
    const c = provider ? providerProfileCompleteness(provider) : { percent: 0, missing: [] };
    return [
      {
        label: "Provider Profile",
        value: `${c.percent}%`,
        icon: Users,
        color: "bg-blue-50 text-blue-600",
        link: "/provider",
      },
      {
        label: "Active Contracts",
        value: contracts.filter((c) => c.status === "ACTIVE").length,
        icon: FileCheck,
        color: "bg-green-50 text-green-600",
        link: "/contracts",
      },
      {
        label: "Active Orders",
        value: serviceOrders.filter((o) => o.status === "ACTIVE").length,
        icon: Package,
        color: "bg-purple-50 text-purple-600",
        link: "/service-orders",
      },
      {
        label: "Activity Log",
        value: "View",
        icon: Activity,
        color: "bg-gray-50 text-gray-700",
        link: "/activity-log",
      },
    ];
  }, [provider, contracts, serviceOrders]);

  const coordinatorStats: StatCard[] = useMemo(() => {
    return [
      {
        label: "Published Contracts",
        value: contracts.filter((c) => c.status === "PUBLISHED").length,
        icon: FileCheck,
        color: "bg-blue-50 text-blue-600",
        link: "/contracts",
      },
      {
        label: "In Negotiation",
        value: contracts.filter((c) => c.status === "IN_NEGOTIATION").length,
        icon: FileCheck,
        color: "bg-yellow-50 text-yellow-600",
        link: "/contracts",
      },
      {
        label: "Active Contracts",
        value: contracts.filter((c) => c.status === "ACTIVE").length,
        icon: FileCheck,
        color: "bg-green-50 text-green-600",
        link: "/contracts",
      },
    ];
  }, [contracts]);

  const specialistStats: StatCard[] = useMemo(() => {
    return [
      {
        label: "My Active Orders",
        value: serviceOrders.filter((o) => o.status === "ACTIVE").length,
        icon: Package,
        color: "bg-green-50 text-green-600",
        link: "/my-orders",
      },
      {
        label: "Completed Orders",
        value: serviceOrders.filter((o) => o.status === "COMPLETED").length,
        icon: Package,
        color: "bg-gray-50 text-gray-700",
        link: "/my-orders",
      },
      {
        label: "My Profile",
        value: "View",
        icon: Users,
        color: "bg-blue-50 text-blue-600",
        link: `/specialists/${currentUser?.id}`,
      },
    ];
  }, [serviceOrders, currentUser?.id]);

  const stats =
    role === "Provider Admin"
      ? adminStats
      : role === "Supplier Representative"
      ? supplierStats
      : role === "Contract Coordinator"
      ? coordinatorStats
      : role === "Specialist"
      ? specialistStats
      : [];

  /* -------------------- previews -------------------- */

  const openRequestsPreview = useMemo(
    () => serviceRequests.filter(isOpenForBidding).slice(0, 5),
    [serviceRequests]
  );

  const offersPreview = useMemo(() => serviceOffers.slice(0, 5), [serviceOffers]);
  const ordersPreview = useMemo(() => serviceOrders.slice(0, 5), [serviceOrders]);
  const contractsPreview = useMemo(() => contracts.slice(0, 5), [contracts]);

  /* -------------------- provider overview card -------------------- */

  const providerOverview = useMemo(() => {
    if (!provider) return null;
    const c = providerProfileCompleteness(provider);
    return {
      percent: c.percent,
      name: safeStr(provider.name),
      id: safeStr(provider.id),
      status: safeStr((provider as any)?.status, "Active"),
      contactEmail: safeStr(provider.contactEmail),
      contactPhone: safeStr(provider.contactPhone),
      address: safeStr(provider.address),
    };
  }, [provider]);

  /* -------------------- sync group2 (contract coordinator only) -------------------- */

  const syncGroup2 = async () => {
    if (!access) return;
    setSyncingG2(true);
    setError("");
    try {
      await syncContractsFromGroup2(access);
      const cs = await getContracts(access);
      setContracts(cs);
    } catch (e: any) {
      setError(e?.message || "Group2 sync failed");
    } finally {
      setSyncingG2(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="p-8">
        <div className="bg-white border rounded-lg p-6 text-gray-600">Please login to view the dashboard.</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl text-gray-900">Welcome back, {currentUser.name}</h1>
          <p className="text-gray-500 mt-1">{role} Dashboard</p>
        </div>

        {/* Only Contract Coordinator gets Group2 sync button */}
        {role === "Contract Coordinator" && (
          <button
            type="button"
            onClick={syncGroup2}
            disabled={syncingG2}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-60"
            title="Sync Contracts from Group 2"
          >
            <RefreshCw size={16} />
            {syncingG2 ? "Syncing..." : "Sync Group2"}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-gray-600">Loading dashboard...</div>
      ) : (
        <>
          {/* Provider overview for Provider Admin + Supplier Rep + Contract Coordinator */}
          {(role === "Provider Admin" || role === "Supplier Representative" || role === "Contract Coordinator") && providerOverview && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-gray-900">
                    <Building2 size={18} className="text-gray-400" />
                    <span className="font-medium truncate">{providerOverview.name}</span>
                  </div>

                  <div className="text-xs text-gray-500 mt-1">
                    Provider ID: <span className="text-gray-700">{providerOverview.id}</span>
                    {" • "}
                    Status: <span className="text-gray-700">{providerOverview.status}</span>
                    {(role === "Provider Admin") && (
                      <>
                        {" • "}
                        Profile completeness:{" "}
                        <span className="text-gray-700">{providerOverview.percent}%</span>
                      </>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-700">
                    <div className="flex items-center gap-2 min-w-0">
                      <Mail size={14} className="text-gray-400" />
                      <span className="truncate">{providerOverview.contactEmail}</span>
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <Phone size={14} className="text-gray-400" />
                      <span className="truncate">{providerOverview.contactPhone}</span>
                    </div>
                    <div className="flex items-start gap-2 min-w-0">
                      <MapPin size={14} className="text-gray-400 mt-0.5" />
                      <span className="truncate">{providerOverview.address}</span>
                    </div>
                  </div>
                </div>

                {/* Actions: provider admin gets manage provider, others get view provider */}
                <div className="flex gap-3 flex-shrink-0">
                  <Link to="/provider" className="text-sm text-blue-600 hover:text-blue-700">
                    {role === "Provider Admin" ? "Manage Provider →" : "View Provider →"}
                  </Link>
                  {role === "Provider Admin" && (
                    <Link to="/users" className="text-sm text-blue-600 hover:text-blue-700">
                      Manage Users →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Stats cards */}
          <div className={`grid grid-cols-1 md:grid-cols-2 ${role === "Contract Coordinator" ? "lg:grid-cols-3" : "lg:grid-cols-4"} gap-6 mb-8`}>
            {stats.map((stat) => {
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

          {/* Provider Admin: 2-column layout with 4 blocks */}
          {role === "Provider Admin" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Open Service Requests */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg text-gray-900">Open Service Requests</h2>
                    <p className="text-xs text-gray-500 mt-1">Latest requests available for bidding</p>
                  </div>
                  <Link to="/service-requests" className="text-sm text-blue-600 hover:text-blue-700">
                    View all →
                  </Link>
                </div>
                <div className="divide-y divide-gray-200">
                  {openRequestsPreview.length ? (
                    openRequestsPreview.map((sr: any) => (
                      <Link
                        key={String(sr.id)}
                        to={`/service-requests/${encodeURIComponent(String(sr.id))}`}
                        className="p-5 hover:bg-gray-50 block"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm text-gray-900 truncate">{safeStr(sr.title)}</div>
                            <div className="text-xs text-gray-500 mt-1 truncate">
                              {safeStr(sr.requestNumber)} • Contract: {safeStr(sr.contractId)}
                            </div>
                          </div>
                          <StatusBadge status={String(sr.status)} />
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="p-6 text-sm text-gray-500 text-center">No open service requests</div>
                  )}
                </div>
              </div>

              {/* Recent Service Offers */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg text-gray-900">Recent Service Offers</h2>
                    <p className="text-xs text-gray-500 mt-1">Latest offers submitted by your provider</p>
                  </div>
                  <Link to="/service-offers" className="text-sm text-blue-600 hover:text-blue-700">
                    View all →
                  </Link>
                </div>
                <div className="divide-y divide-gray-200">
                  {offersPreview.length ? (
                    offersPreview.map((o: any) => (
                      <Link key={String(o.id)} to={`/service-offers/${o.id}`} className="p-5 hover:bg-gray-50 block">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm text-gray-900 truncate">
                              Offer #{o.id} • Request: {safeStr(o?.serviceRequestId || o?.serviceRequest?.id)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 truncate">
                              Total: {moneyLabel(o?.totalCost)} • Specialists:{" "}
                              {Array.isArray(o?.specialists) ? o.specialists.length : 0}
                            </div>
                          </div>
                          <StatusBadge status={String(o?.offerStatus || o?.status || "DRAFT")} />
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="p-6 text-sm text-gray-500 text-center">No recent offers</div>
                  )}
                </div>
              </div>

              {/* Recent Service Orders */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg text-gray-900">Recent Service Orders</h2>
                    <p className="text-xs text-gray-500 mt-1">Active and completed orders</p>
                  </div>
                  <Link to="/service-orders" className="text-sm text-blue-600 hover:text-blue-700">
                    View all →
                  </Link>
                </div>
                <div className="divide-y divide-gray-200">
                  {ordersPreview.length ? (
                    ordersPreview.map((o: any) => (
                      <Link key={String(o.id)} to={`/service-orders/${o.id}`} className="p-5 hover:bg-gray-50 block">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm text-gray-900 truncate">
                              Order #{o.id} • Request: {safeStr(o?.serviceRequestId)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 truncate">
                              Specialist: {safeStr(o?.specialistId)} • Total: {moneyLabel(o?.totalCost)}
                            </div>
                          </div>
                          <StatusBadge status={String(o?.status || "ACTIVE")} />
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="p-6 text-sm text-gray-500 text-center">No service orders yet</div>
                  )}
                </div>
              </div>

              {/* Recent Contracts */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg text-gray-900">Recent Contracts</h2>
                    <p className="text-xs text-gray-500 mt-1">Published / negotiation / active</p>
                  </div>
                  <Link to="/contracts" className="text-sm text-blue-600 hover:text-blue-700">
                    View all →
                  </Link>
                </div>
                <div className="divide-y divide-gray-200">
                  {contractsPreview.length ? (
                    contractsPreview.map((c: any) => (
                      <Link
                        key={String(c.contractId)}
                        to={`/contracts/${encodeURIComponent(String(c.contractId))}`}
                        className="p-5 hover:bg-gray-50 block"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm text-gray-900 truncate">{safeStr(c.title)}</div>
                            <div className="text-xs text-gray-500 mt-1 truncate">
                              {safeStr(c.contractId)} {c.kind ? `• ${c.kind}` : ""}
                            </div>
                          </div>
                          <StatusBadge status={String(c.status)} />
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="p-6 text-sm text-gray-500 text-center">No contracts found</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Supplier Representative: show Service Requests, Offers, Orders (no contracts panel) */}
          {role === "Supplier Representative" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Open Service Requests */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg text-gray-900">Open Service Requests</h2>
                    <p className="text-xs text-gray-500 mt-1">Latest requests available for bidding</p>
                  </div>
                  <Link to="/service-requests" className="text-sm text-blue-600 hover:text-blue-700">
                    View all →
                  </Link>
                </div>
                <div className="divide-y divide-gray-200">
                  {openRequestsPreview.length ? (
                    openRequestsPreview.map((sr: any) => (
                      <Link
                        key={String(sr.id)}
                        to={`/service-requests/${encodeURIComponent(String(sr.id))}`}
                        className="p-5 hover:bg-gray-50 block"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm text-gray-900 truncate">{safeStr(sr.title)}</div>
                            <div className="text-xs text-gray-500 mt-1 truncate">
                              {safeStr(sr.requestNumber)} • Contract: {safeStr(sr.contractId)}
                            </div>
                          </div>
                          <StatusBadge status={String(sr.status)} />
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="p-6 text-sm text-gray-500 text-center">No open service requests</div>
                  )}
                </div>
              </div>

              {/* Recent Service Offers */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg text-gray-900">Recent Service Offers</h2>
                    <p className="text-xs text-gray-500 mt-1">Latest offers submitted by your provider</p>
                  </div>
                  <Link to="/service-offers" className="text-sm text-blue-600 hover:text-blue-700">
                    View all →
                  </Link>
                </div>
                <div className="divide-y divide-gray-200">
                  {offersPreview.length ? (
                    offersPreview.map((o: any) => (
                      <Link key={String(o.id)} to={`/service-offers/${o.id}`} className="p-5 hover:bg-gray-50 block">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm text-gray-900 truncate">
                              Offer #{o.id} • Request: {safeStr(o?.serviceRequestId || o?.serviceRequest?.id)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 truncate">
                              Total: {moneyLabel(o?.totalCost)} • Specialists:{" "}
                              {Array.isArray(o?.specialists) ? o.specialists.length : 0}
                            </div>
                          </div>
                          <StatusBadge status={String(o?.offerStatus || o?.status || "DRAFT")} />
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="p-6 text-sm text-gray-500 text-center">No recent offers</div>
                  )}
                </div>
              </div>

              {/* Recent Service Orders */}
              <div className="bg-white rounded-lg border border-gray-200 lg:col-span-2">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg text-gray-900">Recent Service Orders</h2>
                    <p className="text-xs text-gray-500 mt-1">Active and completed orders</p>
                  </div>
                  <Link to="/service-orders" className="text-sm text-blue-600 hover:text-blue-700">
                    View all →
                  </Link>
                </div>
                <div className="divide-y divide-gray-200">
                  {ordersPreview.length ? (
                    ordersPreview.map((o: any) => (
                      <Link key={String(o.id)} to={`/service-orders/${o.id}`} className="p-5 hover:bg-gray-50 block">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm text-gray-900 truncate">
                              Order #{o.id} • Request: {safeStr(o?.serviceRequestId)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 truncate">
                              Specialist: {safeStr(o?.specialistId)} • Total: {moneyLabel(o?.totalCost)}
                            </div>
                          </div>
                          <StatusBadge status={String(o?.status || "ACTIVE")} />
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="p-6 text-sm text-gray-500 text-center">No service orders yet</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Contract Coordinator: show ONLY contracts list (plus provider info above) */}
          {role === "Contract Coordinator" && (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-lg text-gray-900">Recent Contracts</h2>
                  <p className="text-xs text-gray-500 mt-1">Published / negotiation / active</p>
                </div>
                <Link to="/contracts" className="text-sm text-blue-600 hover:text-blue-700">
                  View all →
                </Link>
              </div>
              <div className="divide-y divide-gray-200">
                {contractsPreview.length ? (
                  contractsPreview.map((c: any) => (
                    <Link
                      key={String(c.contractId)}
                      to={`/contracts/${encodeURIComponent(String(c.contractId))}`}
                      className="p-5 hover:bg-gray-50 block"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm text-gray-900 truncate">{safeStr(c.title)}</div>
                          <div className="text-xs text-gray-500 mt-1 truncate">
                            {safeStr(c.contractId)} {c.kind ? `• ${c.kind}` : ""}
                          </div>
                        </div>
                        <StatusBadge status={String(c.status)} />
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="p-6 text-sm text-gray-500 text-center">No contracts found</div>
                )}
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
