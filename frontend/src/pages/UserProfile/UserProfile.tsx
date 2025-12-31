// src/pages/UserProfile.tsx
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { mockUsers, mockServiceOrders } from "../../data/mockData";
import { StatusBadge } from "../../components/StatusBadge/StatusBadge";
import { Badge } from "../../components/Badge/Bagde";
import {
  ArrowLeft,
  Mail,
  Shield,
  Calendar,
  TrendingUp,
  Save,
  Edit2,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { hasRole } from "../../utils/roleHelpers";

type RouteParams = {
  id: string;
};

export const UserProfile = () => {
  const { id } = useParams<RouteParams>();
  const navigate = useNavigate();
  const { currentUser } = useApp();

  const user = mockUsers.find((u) => u.id === id);

  const [isEditing, setIsEditing] = useState(false);

  const isAdmin = hasRole(currentUser, "Provider Admin");
  const canEdit = isAdmin;
  const isOwnProfile = currentUser.id === id;

  if (!user) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Profile not found</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-4 text-sm text-blue-600 hover:text-blue-700"
        >
          Back
        </button>
      </div>
    );
  }

  const isSpecialist = user.roles.includes("Specialist");
  const specialistOrders = isSpecialist
    ? mockServiceOrders.filter((o) => o.specialistId === id)
    : [];
  const activeOrders = specialistOrders.filter((o) => o.status === "Active");
  const completedOrders = specialistOrders.filter(
    (o) => o.status === "Completed"
  );

  const handleSave = () => {
    alert("Profile updated successfully");
    setIsEditing(false);
  };

  const completionRate =
    (user.serviceRequestsCompleted || 0) > 0
      ? Math.round(
          (completedOrders.length / (user.serviceRequestsCompleted || 1)) * 100
        )
      : 0;

  const gradeWidth =
    user.performanceGrade === "A"
      ? 100
      : user.performanceGrade === "B"
      ? 75
      : user.performanceGrade === "C"
      ? 50
      : 25;

  return (
    <div className="p-8">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={20} />
          Back
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Profile */}
        <div className="space-y-6 lg:col-span-2">
          {/* Header */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="mb-6 flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-2xl text-blue-600">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <h1 className="text-2xl text-gray-900">{user.name}</h1>
                  <p className="mt-1 text-gray-500">
                    {user.materialNumber || user.id}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge status={user.status} />
                    {user.roles.map((role, index) => (
                      <Badge key={index} variant="secondary">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              {canEdit && !isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Edit2 size={16} />
                  Edit Profile
                </button>
              )}
            </div>

            {/* Personal Information */}
            <div className="space-y-4 text-sm">
              <h2 className="text-sm font-medium text-gray-900">
                Personal Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Email</label>
                  <div className="mt-1 flex items-center gap-2">
                    <Mail size={16} className="text-gray-400" />
                    <p className="text-gray-900">{user.email}</p>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Member Since</label>
                  <div className="mt-1 flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    <p className="text-gray-900">{user.createdAt}</p>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Status</label>
                  <p className="mt-1 text-gray-900">{user.status}</p>
                </div>
                {user.materialNumber && (
                  <div>
                    <label className="text-xs text-gray-500">
                      Material Number
                    </label>
                    <p className="mt-1 text-gray-900">{user.materialNumber}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Role Assignments */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-2 text-lg text-gray-900">Role Assignments</h2>
            <p className="mb-4 text-sm text-gray-500">
              {isEditing && canEdit
                ? "Edit assigned roles for this user."
                : "System roles assigned to this user."}
            </p>

            <div className="space-y-3 text-sm">
              {user.roles.map((role, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                >
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-blue-600" />
                    <span className="text-gray-900">{role}</span>
                  </div>
                  {canEdit && isEditing && (
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              {canEdit && isEditing && (
                <button
                  type="button"
                  className="w-full rounded-lg border-2 border-dashed border-gray-300 p-3 text-sm text-gray-600 hover:border-blue-500 hover:text-blue-600"
                >
                  + Add Role
                </button>
              )}
            </div>
          </div>

          {/* Specialist Information */}
          {isSpecialist && (
            <>
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <h2 className="mb-4 text-lg text-gray-900">
                  Specialist Details
                </h2>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-xs text-gray-500">
                      Experience Level
                    </label>
                    {isEditing && canEdit ? (
                      <select className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                        <option>{user.experienceLevel}</option>
                        <option>Junior</option>
                        <option>Mid</option>
                        <option>Senior</option>
                        <option>Expert</option>
                      </select>
                    ) : (
                      <p className="mt-1 text-gray-900">
                        {user.experienceLevel}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">
                      Technology Level
                    </label>
                    {isEditing && canEdit ? (
                      <select className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                        <option>{user.technologyLevel}</option>
                        <option>Basic</option>
                        <option>Intermediate</option>
                        <option>Advanced</option>
                        <option>Expert</option>
                      </select>
                    ) : (
                      <p className="mt-1 text-gray-900">
                        {user.technologyLevel || "N/A"}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">
                      Performance Grade
                    </label>
                    {isEditing && canEdit ? (
                      <select className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                        <option>{user.performanceGrade}</option>
                        <option>A</option>
                        <option>B</option>
                        <option>C</option>
                        <option>D</option>
                      </select>
                    ) : (
                      <p className="mt-1 text-gray-900">
                        Grade {user.performanceGrade}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">
                      Average Daily Rate
                    </label>
                    {isEditing && canEdit ? (
                      <input
                        type="number"
                        defaultValue={user.averageDailyRate}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                    ) : (
                      <p className="mt-1 text-gray-900">
                        €{user.averageDailyRate}
                      </p>
                    )}
                  </div>
                </div>

                {user.skills && user.skills.length > 0 && (
                  <div className="mt-4">
                    <label className="mb-2 block text-xs text-gray-500">
                      Skills
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {user.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <h2 className="mb-4 text-lg text-gray-900">
                  Performance Statistics
                </h2>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-xs text-gray-500">
                      Requests Completed
                    </label>
                    <p className="mt-1 text-2xl text-gray-900">
                      {user.serviceRequestsCompleted || 0}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">
                      Active Orders
                    </label>
                    <p className="mt-1 text-2xl text-gray-900">
                      {user.serviceOrdersActive || 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Service Order History */}
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <h2 className="mb-4 text-lg text-gray-900">
                  Service Order History
                </h2>

                {specialistOrders.length > 0 ? (
                  <div className="space-y-3 text-sm">
                    {specialistOrders.map((order) => (
                      <button
                        type="button"
                        key={order.id}
                        onClick={() => navigate(`/service-orders/${order.id}`)}
                        className="flex w-full cursor-pointer items-start justify-between rounded-lg border border-gray-200 p-4 text-left hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <h3 className="text-sm text-gray-900">
                            {order.role}
                          </h3>
                          <p className="mt-1 text-xs text-gray-500">
                            {order.id}
                          </p>
                          <div className="mt-2 flex items-center gap-3 text-xs text-gray-600">
                            <span>{order.manDays} days</span>
                            <span>•</span>
                            <span>
                              {order.startDate} - {order.endDate}
                            </span>
                            <span>•</span>
                            <span>{order.location}</span>
                          </div>
                        </div>
                        <StatusBadge status={order.status} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    No service orders assigned yet.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-6">
          {isEditing && canEdit && (
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-sm text-gray-900">Save Changes</h2>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Save size={18} />
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {canEdit && (
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-sm text-gray-900">Admin Actions</h2>

              <div className="space-y-3 text-sm">
                <button
                  type="button"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                >
                  {user.status === "Active"
                    ? "Deactivate User"
                    : "Activate User"}
                </button>
                <button
                  type="button"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                >
                  Reset Password
                </button>
              </div>
            </div>
          )}

          {/* Performance Stats */}
          {isSpecialist && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp size={18} className="text-blue-600" />
                <h2 className="text-sm text-gray-900">Performance Overview</h2>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="mb-1 flex justify-between">
                    <span className="text-gray-600">Completion Rate</span>
                    <span className="text-gray-900">{completionRate}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-blue-200">
                    <div
                      className="h-2 rounded-full bg-blue-600"
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between">
                    <span className="text-gray-600">Performance Grade</span>
                    <span className="text-gray-900">
                      {user.performanceGrade}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-blue-200">
                    <div
                      className="h-2 rounded-full bg-blue-600"
                      style={{ width: `${gradeWidth}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-sm text-gray-900">Quick Stats</h2>

            <div className="space-y-3 text-sm">
              <div>
                <label className="text-xs text-gray-500">Account Status</label>
                <p className="mt-1 text-gray-900">{user.status}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Total Roles</label>
                <p className="mt-1 text-gray-900">{user.roles.length}</p>
              </div>
              {isSpecialist && (
                <>
                  <div>
                    <label className="text-xs text-gray-500">
                      Total Orders
                    </label>
                    <p className="mt-1 text-gray-900">
                      {specialistOrders.length}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">
                      Active Orders
                    </label>
                    <p className="mt-1 text-gray-900">{activeOrders.length}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
