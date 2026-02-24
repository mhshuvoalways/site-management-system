import {
  ArrowRightLeft,
  Building,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { ReactNode, useState } from "react";
import logoImg from "@/assets/logo.webp";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const getNavLinks = () => {
    if (profile?.role === "admin") {
      return [
        { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
        { to: "/admin/sites", icon: Building, label: "Sites" },
        { to: "/admin/product-database", icon: Package, label: "Product Database" },
        { to: "/admin/transfers", icon: ArrowRightLeft, label: "Transfers" },
        { to: "/admin/users", icon: Users, label: "Users" },
        { to: "/admin/trash", icon: Trash2, label: "Trash" },
      ];
    }
    if (profile?.role === "site_manager") {
      return [
        { to: "/site-manager", icon: LayoutDashboard, label: "Dashboard" },
        { to: "/site-manager/sites", icon: Building, label: "My Sites" },
        { to: "/site-manager/transfers", icon: ArrowRightLeft, label: "Transfers" },
        { to: "/site-manager/users", icon: Users, label: "Users" },
      ];
    }
    if (profile?.role === "worker") {
      return [
        { to: "/worker", icon: LayoutDashboard, label: "Dashboard" },
        { to: "/worker/time-logs", icon: FileText, label: "Time Logs" },
      ];
    }
    return [];
  };

  const navLinks = getNavLinks();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to={"/"}>
                <img src={logoImg} alt="Logo" className="h-10 rounded-lg" />
              </Link>
            </div>

            <div className="hidden lg:flex items-center space-x-0.5">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg transition text-sm ${
                      isActive
                        ? "bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <link.icon className="w-4 h-4" />
                    <span className="font-medium">{link.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center space-x-3">
              <div className="hidden lg:block text-right">
                <p className="text-sm font-medium text-gray-900">
                  {profile?.full_name}
                </p>
                <p className="text-xs text-gray-500">{profile?.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-3 space-y-1">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                      isActive
                        ? "bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <link.icon className="w-5 h-5" />
                    <span className="font-medium">{link.label}</span>
                  </Link>
                );
              })}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
