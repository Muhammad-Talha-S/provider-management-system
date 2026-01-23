// frontend/src/pages/UserProfile.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge";
import { Badge } from "../components/ui/badge";
import {
  ArrowLeft,
  Mail,
  Shield,
  Calendar,
  TrendingUp,
  Save,
  Edit2,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { hasRole } from "../utils/roleHelpers";
import type { User } from "../types";
import { getUser, patchUser, patchUserRole } from "../api/users";

const ROLE_OPTIONS: User["role"][] = [
  "Provider Admin",
  "Supplier Representative",
  "Contract Coordinator",
  "Specialist",
];

const EXPERIENCE_LEVELS = ["Junior", "Mid", "Senior", "Expert"] as const;
const TECH_LEVELS = ["Basic", "Intermediate", "Advanced", "Expert"] as const;
const PERFORMANCE_GRADES = ["A", "B", "C", "D"] as const;

export const UserProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, tokens } = useApp();

  const [user, setUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // form state (editable)
  const [roleDraft, setRoleDraft] = useState<User["role"]>("Specialist");
  const [statusDraft, setStatusDraft] = useState<User["status"]>("Active");

  const [materialNumberDraft, setMaterialNumberDraft] = useState<string>("");
  const [experienceDraft, setExperienceDraft] = useState<string>("");
  const [techDraft, setTechDraft] = useState<string>("");
  const [gradeDraft, setGradeDraft] = useState<string>("");
  const [rateDraft, setRateDraft] = useState<number | "">("");

  const [availabilityDraft, setAvailabilityDraft] = useState<string>("");
  const [skillsDraft, setSkillsDraft] = useState<string>(""); // comma separated

  if (!currentUser || !id) return null;

  const isAdmin = hasRole(currentUser, "Provider Admin");
  const isOwnProfile = currentUser.id === id;
  const canEdit = isAdmin; // your requirement: Provider Admin edits

  // load user
  useEffect(() => {
    if (!tokens?.access || !id) return;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const u = await getUser(tokens.access, id);
        setUser(u);

        // initialize form drafts
        setRoleDraft(u.role);
        setStatusDraft(u.status);

        setMaterialNumberDraft(u.materialNumber || "");
        setExperienceDraft(u.experienceLevel || "");
        setTechDraft(u.technologyLevel || "");
        setGradeDraft(u.performanceGrade || "");
        setRateDraft(u.averageDailyRate ?? "");

        setAvailabilityDraft(u.availability || "");
        setSkillsDraft((u.skills || []).join(", "));
      } catch (e: any) {
        setError(e?.message || "Failed to load profile");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [tokens?.access, id]);

  const isSpecialist = user?.role === "Specialist";

  const completionRate = useMemo(() => {
    const completed = user?.serviceRequestsCompleted || 0;
    if (!completed) return 0;
    // We don't have orders API yet, so treat completed requests as proxy
    return Math.min(100, Math.round((completed / Math.max(1, completed)) * 100));
  }, [user?.serviceRequestsCompleted]);

  const performanceBar = useMemo(() => {
    const g = user?.performanceGrade;
    return g === "A" ? 100 : g === "B" ? 75 : g === "C" ? 50 : 25;
  }, [user?.performanceGrade]);

  const handleCancel = () => {
    if (!user) return;
    setIsEditing(false);

    // revert drafts
    setRoleDraft(user.role);
    setStatusDraft(user.status);
    setMaterialNumberDraft(user.materialNumber || "");
    setExperienceDraft(user.experienceLevel || "");
    setTechDraft(user.technologyLevel || "");
    setGradeDraft(user.performanceGrade || "");
    setRateDraft(user.averageDailyRate ?? "");
    setAvailabilityDraft(user.availability || "");
    setSkillsDraft((user.skills || []).join(", "));
  };

  const handleSave = async () => {
    if (!tokens?.access || !user) return;

    setSaving(true);
    setError(null);

    try {
      // 1) update role if changed (separate endpoint)
      if (canEdit && roleDraft !== user.role) {
        await patchUserRole(tokens.access, user.id, roleDraft);
      }

      // 2) patch user profile fields
      const patch: Partial<User> = {
        status: statusDraft,
        materialNumber: materialNumberDraft || undefined,
        experienceLevel: (experienceDraft as any) || undefined,
        technologyLevel: (techDraft as any) || undefined,
        performanceGrade: (gradeDraft as any) || undefined,
        averageDailyRate: rateDraft === "" ? undefined : Number(rateDraft),
        availability: (availabilityDraft as any) || undefined,
        skills: skillsDraft
          ? skillsDraft
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
      };

      const updated = await patchUser(tokens.access, user.id, patch);
      setUser(updated);
      setIsEditing(false);
    } catch (e: any) {
      setError(e?.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  // ---------------- Render states ----------------

  if (loading) {
    return (
      <div className="p-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={20} />
          Back
        </button>
        <p className="text-gray-600">Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Profile not found</p>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        <button onClick={() => navigate(-1)} className="mt-4 text-blue-600">
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Profile */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <h1 className="text-2xl text-gray-900">{user.name}</h1>
                  <p className="text-gray-500 mt-1">{user.materialNumber || user.id}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <StatusBadge status={user.status} />
                    <Badge variant="secondary">{user.role}</Badge>
                  </div>
                </div>
              </div>

              {canEdit && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  <Edit2 size={16} />
                  Edit Profile
                </button>
              )}
            </div>

            {/* Personal Information */}
            <div className="space-y-4">
              <h2 className="text-sm text-gray-900">Personal Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Email</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Mail size={16} className="text-gray-400" />
                    <p className="text-sm text-gray-900">{user.email}</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500">Member Since</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar size={16} className="text-gray-400" />
                    <p className="text-sm text-gray-900">{user.createdAt}</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500">Status</label>
                  {isEditing && canEdit ? (
                    <select
                      value={statusDraft}
                      onChange={(e) => setStatusDraft(e.target.value as any)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  ) : (
                    <p className="text-sm text-gray-900 mt-1">{user.status}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs text-gray-500">Material Number</label>
                  {isEditing && canEdit ? (
                    <input
                      value={materialNumberDraft}
                      onChange={(e) => setMaterialNumberDraft(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="e.g. MAT001"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 mt-1">{user.materialNumber || "—"}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Role Assignment */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg text-gray-900 mb-4">Role Assignment</h2>
            <p className="text-sm text-gray-500 mb-4">
              {isEditing && canEdit
                ? "Change the role for this user (Provider Admin only)"
                : "System role assigned to this user"}
            </p>

            {isEditing && canEdit ? (
              <select
                value={roleDraft}
                onChange={(e) => setRoleDraft(e.target.value as User["role"])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-blue-600" />
                  <span className="text-sm text-gray-900">{user.role}</span>
                </div>
              </div>
            )}
          </div>

          {/* Specialist Information */}
          {isSpecialist && (
            <>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg text-gray-900 mb-4">Specialist Details</h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500">Experience Level</label>
                    {isEditing && canEdit ? (
                      <select
                        value={experienceDraft}
                        onChange={(e) => setExperienceDraft(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">—</option>
                        {EXPERIENCE_LEVELS.map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm text-gray-900 mt-1">{user.experienceLevel || "—"}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs text-gray-500">Technology Level</label>
                    {isEditing && canEdit ? (
                      <select
                        value={techDraft}
                        onChange={(e) => setTechDraft(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">—</option>
                        {TECH_LEVELS.map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm text-gray-900 mt-1">{user.technologyLevel || "—"}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs text-gray-500">Performance Grade</label>
                    {isEditing && canEdit ? (
                      <select
                        value={gradeDraft}
                        onChange={(e) => setGradeDraft(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">—</option>
                        {PERFORMANCE_GRADES.map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm text-gray-900 mt-1">
                        {user.performanceGrade ? `Grade ${user.performanceGrade}` : "—"}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs text-gray-500">Average Daily Rate</label>
                    {isEditing && canEdit ? (
                      <input
                        type="number"
                        value={rateDraft}
                        onChange={(e) =>
                          setRateDraft(e.target.value === "" ? "" : Number(e.target.value))
                        }
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    ) : (
                      <p className="text-sm text-gray-900 mt-1">
                        {user.averageDailyRate != null ? `€${user.averageDailyRate}` : "—"}
                      </p>
                    )}
                  </div>

                  <div className="col-span-2">
                    <label className="text-xs text-gray-500">Availability</label>
                    {isEditing && canEdit ? (
                      <input
                        value={availabilityDraft}
                        onChange={(e) => setAvailabilityDraft(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="Available / Partially Booked / Assigned"
                      />
                    ) : (
                      <p className="text-sm text-gray-900 mt-1">{user.availability || "—"}</p>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <label className="text-xs text-gray-500 mb-2 block">Skills</label>
                  {isEditing && canEdit ? (
                    <input
                      value={skillsDraft}
                      onChange={(e) => setSkillsDraft(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="e.g. React, Node.js, PostgreSQL"
                    />
                  ) : user.skills && user.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {user.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">—</p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg text-gray-900 mb-4">Performance Statistics</h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500">Requests Completed</label>
                    <p className="text-2xl text-gray-900 mt-1">{user.serviceRequestsCompleted || 0}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Active Orders</label>
                    <p className="text-2xl text-gray-900 mt-1">{user.serviceOrdersActive || 0}</p>
                  </div>
                </div>
              </div>

              {/* Service Order History (disabled until we implement ServiceOrders API) */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg text-gray-900 mb-2">Service Order History</h2>
                <p className="text-sm text-gray-500">
                  This section will be connected once Service Orders API is implemented.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-6">
          {isEditing && canEdit && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-sm text-gray-900 mb-4">Save Changes</h2>

              <div className="space-y-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  <Save size={18} />
                  {saving ? "Saving..." : "Save Changes"}
                </button>

                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Admin Actions (kept as UI only for now) */}
          {canEdit && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-sm text-gray-900 mb-4">Admin Actions</h2>

              <div className="space-y-3">
                <button
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                  onClick={() => {
                    if (!isEditing) setIsEditing(true);
                    setStatusDraft(user.status === "Active" ? "Inactive" : "Active");
                  }}
                >
                  {user.status === "Active" ? "Deactivate User" : "Activate User"}
                </button>

                <button
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                  onClick={() => alert("Reset password will be implemented later.")}
                >
                  Reset Password
                </button>
              </div>
            </div>
          )}

          {/* Performance Stats */}
          {isSpecialist && (
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={18} className="text-blue-600" />
                <h2 className="text-sm text-gray-900">Performance Overview</h2>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">Completion Rate</span>
                    <span className="text-gray-900">{completionRate}%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${completionRate}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">Performance Grade</span>
                    <span className="text-gray-900">{user.performanceGrade || "—"}</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${performanceBar}%` }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-sm text-gray-900 mb-4">Quick Stats</h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">Account Status</label>
                <p className="text-sm text-gray-900 mt-1">{user.status}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">User Role</label>
                <p className="text-sm text-gray-900 mt-1">{user.role}</p>
              </div>
              {isSpecialist && (
                <>
                  <div>
                    <label className="text-xs text-gray-500">Active Orders</label>
                    <p className="text-sm text-gray-900 mt-1">{user.serviceOrdersActive || 0}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Own profile note */}
          {isOwnProfile && !canEdit && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-sm text-gray-700">
                You are viewing your own profile. Editing is restricted to Provider Admin.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
