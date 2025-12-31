// src/pages/SpecialistsPage.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { mockSpecialists } from '../../data/mockData';
import { Search, Plus, X } from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge/StatusBadge';
import { Badge } from '../../components/Badge/Bagde';

type ExperienceLevel = 'Junior' | 'Mid' | 'Senior' | 'Expert';
type TechnologyLevel = 'Basic' | 'Intermediate' | 'Advanced' | 'Expert';
type PerformanceGrade = 'A' | 'B' | 'C' | 'D';
type SpecialistStatus = 'Active' | 'Inactive';

type FormState = {
  name: string;
  email: string;
  materialNumber: string;
  experienceLevel: ExperienceLevel;
  technologyLevel: TechnologyLevel;
  performanceGrade: PerformanceGrade;
  averageDailyRate: string;
  status: SpecialistStatus;
  roles: string[];
};

const initialFormState: FormState = {
  name: '',
  email: '',
  materialNumber: '',
  experienceLevel: 'Mid',
  technologyLevel: 'Intermediate',
  performanceGrade: 'B',
  averageDailyRate: '',
  status: 'Active',
  roles: ['Specialist'],
};

export const SpecialistsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState<FormState>(initialFormState);

  const filteredSpecialists = mockSpecialists.filter(
    (specialist) =>
      specialist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      specialist.skills?.some((skill: string) =>
        skill.toLowerCase().includes(searchTerm.toLowerCase()),
      ) ||
      specialist.experienceLevel
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Creating specialist:', formData);
    setShowAddDialog(false);
    setFormData(initialFormState);
  };

  const toggleRole = (role: string) => {
    setFormData((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }));
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-gray-900">Specialists</h1>
          <p className="mt-1 text-gray-500">
            Manage specialists and their role assignments
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddDialog(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus size={20} />
          Add Specialist
        </button>
      </div>

      {/* Search */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <div className="relative">
          <Search
            size={20}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search specialists by name, experience, or skills..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredSpecialists.map((specialist) => (
          <div
            key={specialist.id}
            className="rounded-lg border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md"
          >
            <div className="mb-4 flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl text-blue-600">
                {specialist.name.charAt(0)}
              </div>
              <div className="flex-1">
                <h3 className="text-lg text-gray-900">{specialist.name}</h3>
                <p className="text-sm text-gray-500">
                  {specialist.materialNumber || specialist.id}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {specialist.roles.map((role: string, index: number) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {role === 'Provider Admin'
                        ? 'Admin'
                        : role === 'Supplier Representative'
                        ? 'Supplier'
                        : role === 'Contract Coordinator'
                        ? 'Coordinator'
                        : 'Specialist'}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500">Experience Level</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {specialist.experienceLevel}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Technology Level</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {specialist.technologyLevel ?? 'N/A'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500">Performance</p>
                  <p className="mt-1 text-sm text-gray-900">
                    Grade {specialist.performanceGrade}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <div className="mt-1">
                    <StatusBadge status={specialist.status} />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500">Average Daily Rate</p>
                <p className="mt-1 text-sm text-gray-900">
                  €{specialist.averageDailyRate}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500">Completed</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {specialist.serviceRequestsCompleted ?? 0} requests
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Active Orders</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {specialist.serviceOrdersActive ?? 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <Link
                to={`/specialists/${specialist.id}`}
                className="inline-block w-full rounded-lg bg-gray-100 px-4 py-2 text-center text-sm text-gray-700 transition-colors hover:bg-gray-200"
              >
                View Profile
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Add Specialist Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white p-6">
              <h2 className="text-xl text-gray-900">Add New Specialist</h2>
              <button
                type="button"
                onClick={() => setShowAddDialog(false)}
                className="text-gray-400 transition-colors hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-gray-700">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-gray-700">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-700">
                  Material Number *
                </label>
                <input
                  type="text"
                  required
                  value={formData.materialNumber}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      materialNumber: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., MAT005"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-gray-700">
                    Experience Level *
                  </label>
                  <select
                    value={formData.experienceLevel}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        experienceLevel: e.target.value as ExperienceLevel,
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Junior">Junior</option>
                    <option value="Mid">Mid</option>
                    <option value="Senior">Senior</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm text-gray-700">
                    Technology Level *
                  </label>
                  <select
                    value={formData.technologyLevel}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        technologyLevel:
                          e.target.value as TechnologyLevel,
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Basic">Basic</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-gray-700">
                    Performance Grade *
                  </label>
                  <select
                    value={formData.performanceGrade}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        performanceGrade:
                          e.target.value as PerformanceGrade,
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="A">A - Excellent</option>
                    <option value="B">B - Good</option>
                    <option value="C">C - Satisfactory</option>
                    <option value="D">D - Needs Improvement</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm text-gray-700">
                    Average Daily Rate (€) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.averageDailyRate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        averageDailyRate: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 750"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-700">
                  Status *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as SpecialistStatus,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-700">
                  Assigned Roles
                </label>
                <p className="mb-3 text-xs text-gray-500">
                  Specialist role is assigned by default. You can add additional
                  system roles.
                </p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked
                      disabled
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">
                      Specialist (Default)
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.roles.includes(
                        'Supplier Representative',
                      )}
                      onChange={() =>
                        toggleRole('Supplier Representative')
                      }
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">
                      Supplier Representative
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.roles.includes(
                        'Contract Coordinator',
                      )}
                      onChange={() =>
                        toggleRole('Contract Coordinator')
                      }
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">
                      Contract Coordinator
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.roles.includes('Provider Admin')}
                      onChange={() => toggleRole('Provider Admin')}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">
                      Provider Admin
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddDialog(false)}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Add Specialist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
