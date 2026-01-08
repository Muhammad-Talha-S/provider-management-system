import React, { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge";
import { MapPin } from "lucide-react";
import { useApp } from "../context/AppContext";
import { getServiceOrders } from "../api/serviceOrders";
import type { ServiceOrder } from "../api/serviceOrders";
import { getSpecialists } from "../api/specialists";

export const ServiceOrdersPage: React.FC = () => {
  const { tokens, currentUser, currentProvider } = useApp();

  const [rows, setRows] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [specialistNameById, setSpecialistNameById] = useState<Record<string, string>>({});

  if (currentUser?.role === "Specialist") {
    return <Navigate to="/my-orders" replace />;
  }

  useEffect(() => {
    if (!tokens?.access) return;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getServiceOrders(tokens.access);
        setRows(data);

        const specs = await getSpecialists(tokens.access);
        const mine = specs.filter((s: any) => s.providerId === currentProvider?.id);
        setSpecialistNameById(Object.fromEntries(mine.map((s: any) => [s.id, s.name])));
      } catch (e: any) {
        setError(e?.message || "Failed to load service orders");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [tokens?.access, currentProvider?.id]);

  const sorted = useMemo(() => [...rows].sort((a, b) => b.id - a.id), [rows]);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl text-gray-900">Service Orders</h1>
        <p className="text-gray-500 mt-1">Accepted offers currently in execution</p>
      </div>

      {loading && <div className="text-gray-600">Loading orders...</div>}
      {error && !loading && <div className="text-red-600">{error}</div>}

      {!loading && !error && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Order ID</th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Specialist</th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Man-Days</th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {sorted.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{order.id}</div>
                      <div className="text-xs text-gray-500">{order.serviceRequestId}</div>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-700">
                      {specialistNameById[order.specialistId] || order.specialistId}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-900">{order.title}</td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-700">
                        <MapPin size={14} className="text-gray-400" />
                        {order.location}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-900">{order.manDays}</td>

                    <td className="px-6 py-4">
                      <StatusBadge status={order.status} />
                    </td>

                    <td className="px-6 py-4">
                      <Link to={`/service-orders/${order.id}`} className="text-sm text-blue-600 hover:text-blue-700">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sorted.length === 0 && (
            <div className="p-8 text-center text-gray-500">No service orders yet</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ServiceOrdersPage;
