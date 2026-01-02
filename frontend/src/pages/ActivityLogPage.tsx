import React from 'react';
import { mockActivityLogs } from '../data/mockData';
import { Activity, User, Clock, FileText } from 'lucide-react';

export const ActivityLogPage: React.FC = () => {
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
          {mockActivityLogs.map((log) => (
            <div key={log.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 flex-shrink-0">
                  <User size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{log.userName}</span> {log.action.toLowerCase()}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">{log.changes}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock size={14} />
                      {log.timestamp}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                      <FileText size={12} />
                      {log.entity}
                    </span>
                    <span className="text-xs text-gray-500">{log.entityId}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActivityLogPage;