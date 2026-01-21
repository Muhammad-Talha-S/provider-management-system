import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { canEditUserProfile } from "../utils/roleHelpers";
import { StatusBadge } from "../components/StatusBadge";
import { Search, Plus, User as UserIcon } from "lucide-react";
import { Badge } from "../components/ui/badge";
import type { User } from "../types";
import { authFetch } from "../api/http";

export const SpecialistsPage: React.FC = () => {
  const { currentUser, tokens } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const [providerUsers, setProviderUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (!currentUser) return null;

  const isProviderAdmin = canEditUserProfile(currentUser);

  // Fetch users from backend (provider-scoped by backend)
  useEffect(() => {
    if (!tokens?.access) return;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch("/api/users/", tokens.access);
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.detail || "Failed to load users");
        }

        setProviderUsers((data || []) as User[]);
      } catch (e: any) {
        setError(e?.message || "Failed to load users");
        setProviderUsers([]);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [tokens?.access]);

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return providerUsers.filter((user) => {
      // Search filter
      const matchesSearch =
        !q ||
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        user.role.toLowerCase().includes(q) ||
        (user.skills?.some((skill) => skill.toLowerCase().includes(q)) ?? false);

      // Role filter
      const matchesRole = roleFilter === "all" || user.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [providerUsers, roleFilter, searchTerm]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl text-gray-900">Users & Specialists</h1>
          <p className="text-gray-500 mt-1">Manage all provider users and their roles</p>
        </div>

        {isProviderAdmin && (
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus size={20} />
            Add User
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 mb-6">
        <div className="p-4 border-b border-gray-200">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search
                size={20}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search by name, email, role, or skills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">All Roles</option>
              <option value="Provider Admin">Provider Admin</option>
              <option value="Supplier Representative">Supplier Representative</option>
              <option value="Contract Coordinator">Contract Coordinator</option>
              <option value="Specialist">Specialist</option>
            </select>
          </div>
        </div>

        <div className="p-4">
          {loading && <p className="text-sm text-gray-600">Loading users...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {!loading && !error && (
            <>
              <p className="text-sm text-gray-600 mb-4">
                {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""} found
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUsers.map((user) => (
                  <Link
                    key={user.id}
                    to={`/specialists/${user.id}`}
                    className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <UserIcon className="w-6 h-6 text-blue-600" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm text-gray-900 mb-1">{user.name}</h3>
                        <p className="text-xs text-gray-500 mb-2 truncate">{user.email}</p>

                        <div className="flex flex-wrap gap-1 mb-2">
                          <Badge variant="secondary" className="text-xs">
                            {user.role === "Provider Admin"
                              ? "Admin"
                              : user.role === "Supplier Representative"
                              ? "Supplier"
                              : user.role === "Contract Coordinator"
                              ? "Coordinator"
                              : "Specialist"}
                          </Badge>
                          <StatusBadge status={user.status} />
                        </div>

                        {/* Specialist-only info */}
                        {user.role === "Specialist" && (
                          <>
                            {user.availability && (
                              <Badge
                                variant={
                                  user.availability === "Available"
                                    ? "default"
                                    : user.availability === "Partially Booked"
                                    ? "secondary"
                                    : "outline"
                                }
                                className="text-xs mb-2"
                              >
                                {user.availability}
                              </Badge>
                            )}

                            {user.experienceLevel && (
                              <p className="text-xs text-gray-600 mb-1">
                                {user.experienceLevel} Level
                                {user.performanceGrade && ` • Grade ${user.performanceGrade}`}
                              </p>
                            )}

                            {user.skills && user.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {user.skills.slice(0, 3).map((skill, idx) => (
                                  <span
                                    key={idx}
                                    className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded"
                                  >
                                    {skill}
                                  </span>
                                ))}
                                {user.skills.length > 3 && (
                                  <span className="text-xs text-gray-500">
                                    +{user.skills.length - 3}
                                  </span>
                                )}
                              </div>
                            )}

                            {user.averageDailyRate && (
                              <p className="text-xs text-gray-900 mt-2">
                                €{user.averageDailyRate}/day
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {filteredUsers.length === 0 && (
                <p className="text-center text-gray-500 py-12">
                  No users found matching your criteria.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpecialistsPage;
