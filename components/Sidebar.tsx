"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Users, 
  CheckSquare, 
  Settings, 
  LogOut,
  UserCircle,
  Gift,
  Banknote,
  Menu,
  ChevronLeft,
  ChevronRight,
  Layers,
  Wallet,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isInvestor, setIsInvestor] = useState(false);
  const [, setIsLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  // Detect screen size and fetch user role
  useEffect(() => {
    const fetchRoleAndResize = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Check Admin
        const { data: empData } = await supabase
          .from('employees')
          .select('role')
          .eq('auth_id', user.id);
        const admin = (empData || []).some(emp => emp.role === 'admin');
        setIsAdmin(admin);

        // Check Investor
        const { data: invData } = await supabase
          .from('investors')
          .select('id')
          .eq('auth_id', user.id)
          .maybeSingle();
        setIsInvestor(!!invData);
      }
      setIsLoading(false);

      // Handle resize
      const handleResize = () => {
        setIsMobile(window.innerWidth < 1024);
        if (window.innerWidth < 1024) {
          setIsOpen(false);
        } else {
          setIsOpen(true);
        }
      };
      handleResize();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    };
    fetchRoleAndResize();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (pathname === "/login" || pathname === "/signup" || pathname === "/") {
    return null;
  }

  // Determine Navigation Items based on Role
  let navItems = [];

  if (isAdmin) {
    // Admin sees everything
    navItems = [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Admin Panel", href: "/admin", icon: Users },
      { name: "Investors", href: "/investors", icon: Wallet },
      { name: "Clients", href: "/clients", icon: UserCircle },
      { name: "Sector Tasks", href: "/sector-tasks", icon: Layers },
      { name: "Tasks", href: "/tasks", icon: CheckSquare },
      { name: "Birthdays", href: "/birthdays", icon: Gift },
      { name: "Tithe", href: "/tithe", icon: Banknote },
      { name: "Settings", href: "/settings", icon: Settings },
    ];
  } else if (isInvestor) {
    // Investor sees only Investors and Settings
    navItems = [
      { name: "Investors", href: "/investors", icon: Wallet },
      { name: "Settings", href: "/settings", icon: Settings },
    ];
  } else {
    // Standard Employee sees everything except Admin Panel and Investors
    navItems = [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Clients", href: "/clients", icon: UserCircle },
      { name: "Sector Tasks", href: "/sector-tasks", icon: Layers },
      { name: "Tasks", href: "/tasks", icon: CheckSquare },
      { name: "Birthdays", href: "/birthdays", icon: Gift },
      { name: "Tithe", href: "/tithe", icon: Banknote },
      { name: "Settings", href: "/settings", icon: Settings },
    ];
  }

  // Mobile hamburger menu
  if (isMobile) {
    return (
      <>
        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white">M</span>
            Maogast
          </h1>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Menu className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Mobile Sidebar Overlay */}
        {isOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <aside
          className={`fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Mobile Sidebar Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white">M</span>
              Maogast
            </h1>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </aside>
      </>
    );
  }

  // Desktop Sidebar
  return (
    <aside
      className={`bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-screen sticky top-0 transition-all duration-300 ${
        isOpen ? "w-64" : "w-20"
      }`}
    >
      {/* Desktop Header with Toggle */}
      <div className={`p-4 border-b border-gray-200 dark:border-gray-700 flex items-center ${isOpen ? 'justify-between' : 'justify-center'}`}>
        {isOpen ? (
          <>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white">M</span>
              Maogast
            </h1>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsOpen(true)}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        )}
      </div>

      <nav className="flex-1 p-2 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <item.icon className={`${isOpen ? 'w-5 h-5' : 'w-6 h-6'}`} />
              {isOpen && <span className="font-medium">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={`p-4 border-t border-gray-200 dark:border-gray-700 ${isOpen ? '' : 'flex justify-center'}`}>
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 px-4 py-3 w-full text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ${isOpen ? '' : 'justify-center'}`}
        >
          <LogOut className="w-5 h-5" />
          {isOpen && <span className="font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
}