// src/pages/UsersPage.tsx
import { Link } from 'react-router-dom';
import { mockUsers } from '../../data/mockData';
// import { Badge } from '../components/ui/badge';
import { Plus, Mail } from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge/StatusBadge';

export const UsersPage = () => {
  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-gray-900">Users &amp; Roles</h1>
          <p className="mt-1 text-gray-500">
            Manage user accounts and role assignments
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus size={20} />
          Add User
        </button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  User
                </th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Email
                </th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Roles
                </th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Created
                </th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {mockUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm text-gray-900">
                          {user.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {user.materialNumber || user.id}
                        </div>
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
                      {/* {user.roles.map((role: string, index: number) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-xs"
                        >
                          {role === 'Provider Admin'
                            ? 'Admin'
                            : role === 'Supplier Representative'
                            ? 'Supplier'
                            : role === 'Contract Coordinator'
                            ? 'Coordinator'
                            : 'Specialist'}
                        </Badge>
                      ))} */}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={user.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {user.createdAt}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      to={`/users/${user.id}`}
                      className="text-sm text-blue-600 transition-colors hover:text-blue-700"
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
