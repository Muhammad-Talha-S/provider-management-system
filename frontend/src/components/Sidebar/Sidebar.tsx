// src/components/Sidebar.tsx
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Send,
  Package,
  FileCheck,
  Users,
  Settings,
  Activity,
  User as UserIcon,
  type LucideIcon,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { isSpecialistOnly } from '../../utils/roleHelpers';
import { Badge } from '../Badge/Bagde';

type Role =
  | 'Provider Admin'
  | 'Supplier Representative'
  | 'Contract Coordinator'
  | 'Specialist';

type NavItem = {
  path: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
};

export const Sidebar = () => {
  const location = useLocation();
  const { currentUser } = useApp();

  const specialistOnlyView = isSpecialistOnly(currentUser);

  const specialistNavItems: NavItem[] = [
    {
      path: `/users/${currentUser.id}`,
      label: 'My Profile',
      icon: UserIcon,
      roles: ['Specialist'],
    },
    {
      path: '/my-orders',
      label: 'My Orders',
      icon: Package,
      roles: ['Specialist'],
    },
  ];

  const fullNavItems: NavItem[] = [
    {
      path: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['Provider Admin', 'Supplier Representative', 'Contract Coordinator'],
    },
    {
      path: '/service-requests',
      label: 'Service Requests',
      icon: FileText,
      roles: ['Provider Admin', 'Supplier Representative'],
    },
    {
      path: '/service-offers',
      label: 'Service Offers',
      icon: Send,
      roles: ['Provider Admin', 'Supplier Representative'],
    },
    {
      path: '/service-orders',
      label: 'Service Orders',
      icon: Package,
      roles: ['Provider Admin', 'Supplier Representative'],
    },
    {
      path: '/contracts',
      label: 'Contracts',
      icon: FileCheck,
      roles: ['Provider Admin', 'Contract Coordinator'],
    },
    {
      path: '/specialists',
      label: 'Specialists',
      icon: Users,
      roles: ['Provider Admin', 'Supplier Representative'],
    },
    {
      path: '/users',
      label: 'Users & Roles',
      icon: Settings,
      roles: ['Provider Admin'],
    },
    {
      path: '/activity-log',
      label: 'Activity Log',
      icon: Activity,
      roles: ['Provider Admin'],
    },
  ];

  const navItems = specialistOnlyView ? specialistNavItems : fullNavItems;

  const filteredNavItems = navItems.filter((item) =>
    item.roles.some((role) => currentUser.roles.includes(role)),
  );

  return (
    <div className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-200 p-6">
        <h1 className="text-xl text-gray-900">Provider Portal</h1>
        <p className="mt-1 text-sm text-gray-500">FraUAS</p>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            {currentUser.name.charAt(0)}
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-900">{currentUser.name}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {currentUser.roles.map((role, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="px-1.5 py-0 text-xs"
                >
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
      </div>
    </div>
  );
};
