import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Send,
  Package,
  FileCheck,
  Users,
  Activity,
  User as UserIcon,
  Building2,
  LogOut,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { isSpecialistOnly } from "../utils/roleHelpers";
import { Badge } from "./ui/badge";

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useApp();

  if (!currentUser) return null;

  const specialistOnlyView = isSpecialistOnly(currentUser);

  // Specialist-only navigation
  const specialistNavItems = [
    { path: "/specialists/" + currentUser.id, label: "My Profile", icon: UserIcon, roles: ["Specialist"] },
    { path: "/my-orders", label: "My Orders", icon: Package, roles: ["Specialist"] },
  ];

  // Full navigation for other roles
  const fullNavItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["Provider Admin", "Supplier Representative", "Contract Coordinator"] },
    { path: "/service-requests", label: "Service Requests", icon: FileText, roles: ["Provider Admin", "Supplier Representative"] },
    { path: "/service-offers", label: "Service Offers", icon: Send, roles: ["Provider Admin", "Supplier Representative"] },
    { path: "/service-orders", label: "Service Orders", icon: Package, roles: ["Provider Admin", "Supplier Representative"] },
    { path: "/contracts", label: "Contracts", icon: FileCheck, roles: ["Provider Admin", "Contract Coordinator"] },
    { path: "/specialists", label: "Users", icon: Users, roles: ["Provider Admin", "Supplier Representative", "Contract Coordinator"] },
    { path: "/provider", label: "Provider", icon: Building2, roles: ["Provider Admin"] },
    { path: "/activity-log", label: "Activity Log", icon: Activity, roles: ["Provider Admin"] },
  ];

  const navItems = specialistOnlyView ? specialistNavItems : fullNavItems;
  const filteredNavItems = navItems.filter((item) => item.roles.includes(currentUser.role));

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl text-gray-900">Provider Portal</h1>
        <p className="text-sm text-gray-500 mt-1">FraUAS</p>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;

            const isActive =
              location.pathname === item.path ||
              location.pathname.startsWith(item.path + "/");

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-50"
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

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            {currentUser.name.charAt(0)}
          </div>

          <div className="flex-1">
            <p className="text-sm text-gray-900">{currentUser.name}</p>
            <Badge variant="secondary" className="text-xs px-1.5 py-0 mt-1">
              {currentUser.role === "Provider Admin"
                ? "Admin"
                : currentUser.role === "Supplier Representative"
                ? "Supplier"
                : currentUser.role === "Contract Coordinator"
                ? "Coordinator"
                : "Specialist"}
            </Badge>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Logout"
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
