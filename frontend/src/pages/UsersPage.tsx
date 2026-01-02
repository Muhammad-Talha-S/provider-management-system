import React from 'react';
import { Link } from 'react-router-dom';
import { mockUsers } from '../data/mockData';
import { StatusBadge } from '../components/StatusBadge';
import { Badge } from '../components/ui/badge';
import { Plus, Mail, Shield } from 'lucide-react';

export const UsersPage: React.FC = () => {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl text-gray-900">Users & Roles</h1>
          <p className="text-gray-500 mt-1">Manage user accounts and role assignments</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus size={20} />
          Add User
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">User</th>
                <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Roles</th>
                <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Created</th>
                <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {mockUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm text-gray-900">{user.name}</div>
                        <div className="text-xs text-gray-500">{user.materialNumber || user.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Mail size={14} className="text-gray-400" />
                      {user.email}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {role === 'Provider Admin' ? 'Admin' : 
                           role === 'Supplier Representative' ? 'Supplier' :
                           role === 'Contract Coordinator' ? 'Coordinator' :
                           'Specialist'}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={user.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{user.createdAt}</td>
                  <td className="px-6 py-4">
                    <Link 
                      to={`/users/${user.id}`}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};