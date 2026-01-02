import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { mockUsers } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { canEditUserProfile } from '../utils/roleHelpers';
import { StatusBadge } from '../components/StatusBadge';
import { Search, Plus, User, UserCheck, X } from 'lucide-react';
import { Badge } from '../components/ui/badge';

export const SpecialistsPage: React.FC = () => {
  const { currentUser } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  if (!currentUser) return null;

  // Filter users by current provider
  const providerUsers = mockUsers.filter(u => u.providerId === currentUser.providerId);

  const filteredUsers = providerUsers.filter((user) => {
    // Search filter
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.skills?.some((skill) => skill.toLowerCase().includes(searchTerm.toLowerCase()));

    // Role filter
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const isProviderAdmin = canEditUserProfile(currentUser);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl text-gray-900">Users & Specialists</h1>
          <p className="text-gray-500 mt-1">Manage all provider users and their roles</p>
        </div>
        {isProviderAdmin && (
          <button 
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            Add User
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 mb-6">
        <div className="p-4 border-b border-gray-200">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
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
          <p className="text-sm text-gray-600 mb-4">
            {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
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
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm text-gray-900 mb-1">{user.name}</h3>
                    <p className="text-xs text-gray-500 mb-2 truncate">{user.email}</p>
                    
                    <div className="flex flex-wrap gap-1 mb-2">
                      <Badge variant="secondary" className="text-xs">
                        {user.role === 'Provider Admin' ? 'Admin' : 
                         user.role === 'Supplier Representative' ? 'Supplier' :
                         user.role === 'Contract Coordinator' ? 'Coordinator' :
                         'Specialist'}
                      </Badge>
                      <StatusBadge status={user.status} size="sm" />
                    </div>

                    {/* Show specialist-specific info if user is a specialist */}
                    {user.role === 'Specialist' && (
                      <>
                        {user.availability && (
                          <Badge 
                            variant={
                              user.availability === 'Available' ? 'default' :
                              user.availability === 'Partially Booked' ? 'secondary' :
                              'outline'
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
                              <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                                {skill}
                              </span>
                            ))}
                            {user.skills.length > 3 && (
                              <span className="text-xs text-gray-500">+{user.skills.length - 3}</span>
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
            <p className="text-center text-gray-500 py-12">No users found matching your criteria.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpecialistsPage;