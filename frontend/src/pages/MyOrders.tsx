import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Package, Calendar, MapPin } from "lucide-react";

import { useApp } from "../context/AppContext";
import { StatusBadge } from "../components/StatusBadge";

import { getMyOrders } from "../api/serviceOrders";
import type { ServiceOrder } from "../types";

/**
 * MyOrders shows orders assigned to a Specialist.
 * Backend should already filter orders for the authenticated specialist.
 */
export const MyOrders: React.FC = () => {
  const { currentUser, tokens } = useApp();

  const [rows, setRows] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!tokens?.access) {
        setLoading(false);
        return;
      }

      if (currentUser?.role !== "Specialist") {
        setError("Only Specialists can view My Orders.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await getMyOrders(tokens.access);
        setRows(data);
      } catch (e: any) {
        setError(e?.message || "Failed to load my orders");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [tokens?.access, currentUser?.role]);

  const activeOrders = useMemo(() => rows.filter((o) => o.status === "ACTIVE"), [rows]);
  const completedOrders = useMemo(() => rows.filter((o) => o.status === "COMPLETED"), [rows]);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl text-gray-900">My Service Orders</h1>
        <p className="text-gray-500 mt-1">View your assigned service orders and their status</p>
      </div>

      {loading && <div className="text-gray-600">Loading...</div>}
      {error && !loading && <div className="text-red-600">{error}</div>}

      {!loading && !error && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Orders</p>
                  <p className="text-3xl text-gray-900 mt-2">{rows.length}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Package size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Active Orders</p>
                  <p className="text-3xl text-gray-900 mt-2">{activeOrders.length}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                  <Package size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Completed</p>
                  <p className="text-3xl text-gray-900 mt-2">{completedOrders.length}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center">
                  <Package size={24} />
                </div>
              </div>
            </div>
          </div>

          {/* Active Orders */}
          {activeOrders.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg text-gray-900 mb-4">Active Orders</h2>
              <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
                {activeOrders.map((order) => (
                  <Link
                    key={order.id}
                    to={`/service-orders/${order.id}`}
                    className="block p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        {/* types.ts ServiceOrder doesn't have title/dates/location/manDays.
                            If your backend returns them, extend the types OR use a local detail type.
                            For now, show minimal info to keep build green. */}
                        <h3 className="text-sm text-gray-900">Order #{order.id}</h3>
                        <p className="text-xs text-gray-500 mt-1">Request: {order.serviceRequestId}</p>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400" />
                        <div>
                          <p className="text-gray-500">Created</p>
                          <p className="text-gray-900">{order.createdAt || "-"}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-gray-400" />
                        <div>
                          <p className="text-gray-500">Provider</p>
                          <p className="text-gray-900">{order.providerId}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-gray-500">Total Cost</p>
                        <p className="text-gray-900">€{Number(order.totalCost || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Completed Orders */}
          {completedOrders.length > 0 && (
            <div>
              <h2 className="text-lg text-gray-900 mb-4">Completed Orders</h2>
              <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
                {completedOrders.map((order) => (
                  <Link
                    key={order.id}
                    to={`/service-orders/${order.id}`}
                    className="block p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-sm text-gray-900">Order #{order.id}</h3>
                        <p className="text-xs text-gray-500 mt-1">Request: {order.serviceRequestId}</p>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400" />
                        <div>
                          <p className="text-gray-500">Created</p>
                          <p className="text-gray-900">{order.createdAt || "-"}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-gray-400" />
                        <div>
                          <p className="text-gray-500">Provider</p>
                          <p className="text-gray-900">{order.providerId}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-gray-500">Total Cost</p>
                        <p className="text-gray-900">€{Number(order.totalCost || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {rows.length === 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <Package size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg text-gray-900 mb-2">No Service Orders</h3>
              <p className="text-gray-500">You don't have any assigned service orders yet.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MyOrders;
