import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockUsers, mockServiceOrders } from '../data/mockData';
import { StatusBadge } from '../components/StatusBadge';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Mail, Shield, Calendar, TrendingUp, Save, Edit2, Briefcase } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { hasRole } from '../utils/roleHelpers';

export const UserProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useApp();
  
  // Find user in the unified user list
  const user = mockUsers.find((u) => u.id === id);
  
  const [isEditing, setIsEditing] = useState(false);

  const isAdmin = hasRole(currentUser!, 'Provider Admin');
  const canEdit = isAdmin;
  const isOwnProfile = currentUser!.id === id;

  if (!user) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Profile not found</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-blue-600">
          Back
        </button>
      </div>
    );
  }

  const isSpecialist = user.role === 'Specialist';
  const specialistOrders = isSpecialist ? mockServiceOrders.filter((o) => o.specialistId === id) : [];
  const activeOrders = specialistOrders.filter((o) => o.status === 'Active');
  const completedOrders = specialistOrders.filter((o) => o.status === 'Completed');

  const handleSave = () => {
    alert('Profile updated successfully');
    setIsEditing(false);
  };

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
                  <p className="text-gray-500 mt-1">
                    {user.materialNumber || user.id}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <StatusBadge status={user.status} />
                    <Badge variant="secondary">
                      {user.role}
                    </Badge>
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
                  <p className="text-sm text-gray-900 mt-1">{user.status}</p>
                </div>
                {user.materialNumber && (
                  <div>
                    <label className="text-xs text-gray-500">Material Number</label>
                    <p className="text-sm text-gray-900 mt-1">{user.materialNumber}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Role Assignment */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg text-gray-900 mb-4">Role Assignment</h2>
            <p className="text-sm text-gray-500 mb-4">
              {isEditing && canEdit 
                ? 'Change the role for this user (Provider Admin only)' 
                : 'System role assigned to this user'}
            </p>
            
            {isEditing && canEdit ? (
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value={user.role}>{user.role}</option>
                <option value="Provider Admin">Provider Admin</option>
                <option value="Supplier Representative">Supplier Representative</option>
                <option value="Contract Coordinator">Contract Coordinator</option>
                <option value="Specialist">Specialist</option>
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
                      <select className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm">
                        <option>{user.experienceLevel}</option>
                        <option>Junior</option>
                        <option>Mid</option>
                        <option>Senior</option>
                        <option>Expert</option>
                      </select>
                    ) : (
                      <p className="text-sm text-gray-900 mt-1">{user.experienceLevel}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Technology Level</label>
                    {isEditing && canEdit ? (
                      <select className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm">
                        <option>{user.technologyLevel}</option>
                        <option>Basic</option>
                        <option>Intermediate</option>
                        <option>Advanced</option>
                        <option>Expert</option>
                      </select>
                    ) : (
                      <p className="text-sm text-gray-900 mt-1">{user.technologyLevel || 'N/A'}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Performance Grade</label>
                    {isEditing && canEdit ? (
                      <select className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm">
                        <option>{user.performanceGrade}</option>
                        <option>A</option>
                        <option>B</option>
                        <option>C</option>
                        <option>D</option>
                      </select>
                    ) : (
                      <p className="text-sm text-gray-900 mt-1">Grade {user.performanceGrade}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Average Daily Rate</label>
                    {isEditing && canEdit ? (
                      <input 
                        type="number" 
                        defaultValue={user.averageDailyRate}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    ) : (
                      <p className="text-sm text-gray-900 mt-1">€{user.averageDailyRate}</p>
                    )}
                  </div>
                </div>

                {user.skills && user.skills.length > 0 && (
                  <div className="mt-4">
                    <label className="text-xs text-gray-500 mb-2 block">Skills</label>
                    <div className="flex flex-wrap gap-2">
                      {user.skills.map((skill, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
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

              {/* Service Order History */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg text-gray-900 mb-4">Service Order History</h2>
                
                {specialistOrders.length > 0 ? (
                  <div className="space-y-3">
                    {specialistOrders.map((order) => (
                      <div key={order.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigate(`/service-orders/${order.id}`)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-sm text-gray-900">{order.role}</h3>
                            <p className="text-xs text-gray-500 mt-1">{order.id}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                              <span>{order.manDays} days</span>
                              <span>•</span>
                              <span>{order.startDate} - {order.endDate}</span>
                              <span>•</span>
                              <span>{order.location}</span>
                            </div>
                          </div>
                          <StatusBadge status={order.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No service orders assigned yet</p>
                )}
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
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Save size={18} />
                  Save Changes
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {canEdit && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-sm text-gray-900 mb-4">Admin Actions</h2>
              
              <div className="space-y-3">
                <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
                  {user.status === 'Active' ? 'Deactivate User' : 'Activate User'}
                </button>
                <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
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
                    <span className="text-gray-900">
                      {(user.serviceRequestsCompleted || 0) > 0 
                        ? Math.round((completedOrders.length / (user.serviceRequestsCompleted || 1)) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ 
                        width: `${(user.serviceRequestsCompleted || 0) > 0 
                          ? Math.round((completedOrders.length / (user.serviceRequestsCompleted || 1)) * 100)
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">Performance Grade</span>
                    <span className="text-gray-900">{user.performanceGrade}</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ 
                        width: `${user.performanceGrade === 'A' ? 100 : 
                                 user.performanceGrade === 'B' ? 75 : 
                                 user.performanceGrade === 'C' ? 50 : 25}%` 
                      }}
                    ></div>
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
                    <label className="text-xs text-gray-500">Total Orders</label>
                    <p className="text-sm text-gray-900 mt-1">{specialistOrders.length}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Active Orders</label>
                    <p className="text-sm text-gray-900 mt-1">{activeOrders.length}</p>
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

export default UserProfile;