import React, { useEffect, useState } from "react";
import { Activity, User, Clock, FileText } from "lucide-react";
import { useApp } from "../context/AppContext";
import { hasAnyRole } from "../utils/roleHelpers";
import { getActivityLogs, type ActivityLog } from "../api/activityLogs";

export const ActivityLogPage: React.FC = () => {
  const { currentUser, tokens } = useApp();
  const access = tokens?.access || "";

  const canSee = hasAnyRole(currentUser, ["Provider Admin"]);

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const refresh = async () => {
    if (!access) return;
    setLoading(true);
    setErr(null);
    try {
      const data = await getActivityLogs(access);
      setLogs(data);
    } catch (e: any) {
      setErr(e?.message || "Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canSee) {
      setLoading(false);
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access, canSee]);

  if (!canSee) {
    return (
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl text-gray-900">Activity Log</h1>
          <p className="text-gray-500 mt-1">Only Provider Admins can view this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-gray-600">Loading activity logs...</p>
      </div>
    );
  }

  if (err) {
    return (
      <div className="p-8">
        <p className="text-gray-500">{err}</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl text-gray-900">Activity Log</h1>
        <p className="text-gray-500 mt-1">View all user actions and data changes</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Activity size={18} />
            <span>Recent Activities</span>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {logs.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">No activity yet.</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 flex-shrink-0">
                    <User size={18} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-gray-900">
                          <span className="font-medium">
                            {log.actorUserName || log.actor_type}
                          </span>{" "}
                          {log.message}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">{log.event_type}</p>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock size={14} />
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-3">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        <FileText size={12} />
                        {log.entity_type}
                      </span>
                      <span className="text-xs text-gray-500">{log.entity_id}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityLogPage;
