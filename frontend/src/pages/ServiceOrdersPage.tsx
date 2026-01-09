import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import { useApp } from "../context/AppContext";
import { getServiceOrders } from "../api/serviceOrders";
import type { ServiceOrder } from "../api/serviceOrders";

export const ServiceOrdersPage: React.FC = () => {
  const { tokens } = useApp();
  const [rows, setRows] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!tokens?.access) return;
      setLoading(true);
      setError(null);
      try {
        const data = await getServiceOrders(tokens.access);
        setRows(data);
      } catch (e: any) {
        setError(e?.message || "Failed to load service orders");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [tokens?.access]);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl text-gray-900">Service Orders</h1>
        <p className="text-gray-500 mt-1">Accepted service offers currently in execution</p>
      </div>

      {loading && <div className="text-gray-600">Loading service orders...</div>}
      {error && !loading && <div className="text-red-600">{error}</div>}

      {!loading && !error && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Order ID</th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Request</th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Specialist</th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Dates</th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Man-Days</th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {rows.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{order.id}</div>
                      <div className="text-xs text-gray-500">Offer: {order.serviceOfferId}</div>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-700">{order.serviceRequestId}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{order.specialistId}</td>

                    <td className="px-6 py-4 text-sm text-gray-700">
                      {order.startDate || "-"} — {order.endDate || "-"}
                    </td>

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

          {rows.length === 0 && <div className="p-8 text-center text-gray-500">No service orders found</div>}
        </div>
      )}
    </div>
  );
};

export default ServiceOrdersPage;
