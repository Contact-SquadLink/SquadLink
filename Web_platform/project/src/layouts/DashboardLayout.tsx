import { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  Menu,
  X,
  ShoppingBag,
  ShoppingCart,
  LogOut,
  Bell,
  User as UserIcon,
  LayoutDashboard,
  Package,
  Store,
  Bike,
  Shield,
  ClipboardList,
  Home,
  ChevronRight,
  Repeat,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { cn } from '@/utils/format';
import type { Role } from '@/types';

interface NavLink {
  label: string;
  path: string;
  icon: typeof Home;
  roles: Role[];
}

const allNavLinks: NavLink[] = [
  { label: 'Home', path: '/', icon: Home, roles: ['CUSTOMER', 'BUSINESS_USER', 'RIDER', 'ADMIN'] },
  { label: 'Browse', path: '/browse', icon: ShoppingBag, roles: ['CUSTOMER', 'BUSINESS_USER', 'RIDER', 'ADMIN'] },
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['CUSTOMER'] },
  { label: 'Cart', path: '/cart', icon: ShoppingCart, roles: ['CUSTOMER', 'BUSINESS_USER', 'RIDER', 'ADMIN'] },
  { label: 'Orders', path: '/orders', icon: Package, roles: ['CUSTOMER', 'BUSINESS_USER'] },
  { label: 'Notifications', path: '/notifications', icon: Bell, roles: ['CUSTOMER', 'BUSINESS_USER', 'RIDER', 'ADMIN'] },
  { label: 'Profile', path: '/profile', icon: UserIcon, roles: ['CUSTOMER', 'BUSINESS_USER', 'RIDER', 'ADMIN'] },
  // Business
  { label: 'Dashboard', path: '/business', icon: LayoutDashboard, roles: ['BUSINESS_USER'] },
  { label: 'Orders', path: '/business/orders', icon: ClipboardList, roles: ['BUSINESS_USER'] },
  { label: 'Catalog', path: '/business/catalog', icon: Store, roles: ['BUSINESS_USER'] },
  // Rider
  { label: 'Deliveries', path: '/rider', icon: Bike, roles: ['RIDER'] },
  // Admin
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard, roles: ['ADMIN'] },
  { label: 'Businesses', path: '/admin/businesses', icon: Shield, roles: ['ADMIN'] },
  { label: 'Access', path: '/admin/access', icon: Shield, roles: ['ADMIN'] },
];

const roleLabels: Record<Role, string> = {
  CUSTOMER: 'Customer',
  BUSINESS_USER: 'Business',
  RIDER: 'Rider',
  ADMIN: 'Admin',
};

const roleColors: Record<Role, string> = {
  CUSTOMER: 'bg-primary-100 text-primary-700',
  BUSINESS_USER: 'bg-secondary-100 text-secondary-700',
  RIDER: 'bg-accent-100 text-accent-700',
  ADMIN: 'bg-gray-800 text-white',
};

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return null;

  const links = allNavLinks.filter((l) => l.roles.includes(user.role));

  const dashboardPath =
    user.role === 'BUSINESS_USER'
      ? '/business'
      : user.role === 'RIDER'
        ? '/rider'
        : user.role === 'ADMIN'
          ? '/admin'
          : '/dashboard';
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-gray-900">
              SQUAD<span className="text-primary-600">LINK</span>
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 flex-col border-r border-gray-200 bg-white">
        <SidebarContent
          user={user}
          links={links}
          isActive={isActive}
          onLogout={handleLogout}
          itemCount={itemCount}
          roleLabel={roleLabels[user.role]}
          roleColor={roleColors[user.role]}
        />
      </aside>

      {/* Sidebar — mobile drawer */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl flex flex-col animate-slide-down">
            <div className="flex items-center justify-between px-4 h-16 border-b border-gray-100">
              <Link to="/" className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <span className="font-display text-lg font-bold tracking-tight text-gray-900">
                  SQUAD<span className="text-primary-600">LINK</span>
                </span>
              </Link>
              <button
                onClick={() => setSidebarOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarContent
              user={user}
              links={links}
              isActive={isActive}
              onLogout={handleLogout}
              itemCount={itemCount}
              roleLabel={roleLabels[user.role]}
              roleColor={roleColors[user.role]}
              onNavigate={() => setSidebarOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="lg:pl-64">
        <main className="min-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

interface SidebarContentProps {
  user: { firstName?: string; lastName?: string; email?: string | null; role: Role };
  links: NavLink[];
  isActive: (path: string) => boolean;
  onLogout: () => void;
  itemCount: number;
  roleLabel: string;
  roleColor: string;
  onNavigate?: () => void;
}

function SidebarContent({
  user,
  links,
  isActive,
  onLogout,
  itemCount,
  roleLabel,
  roleColor,
  onNavigate,
}: SidebarContentProps) {
  return (
    <>
      {/* Desktop logo */}
      <div className="hidden lg:flex items-center gap-2.5 px-6 h-16 border-b border-gray-100">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white">
          <ShoppingBag className="h-5 w-5" />
        </div>
        <span className="font-display text-lg font-bold tracking-tight text-gray-900">
          SQUAD<span className="text-primary-600">LINK</span>
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.path);
          return (
            <Link
              key={`${link.path}-${link.label}`}
              to={link.path}
              onClick={onNavigate}
              className={cn(
                'flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4.5 w-4.5 shrink-0" />
                {link.label}
              </span>
              {link.label === 'Cart' && itemCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary-500 px-1 text-xs font-bold text-secondary-950">
                  {itemCount}
                </span>
              )}
              {active && <ChevronRight className="h-4 w-4" />}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold', roleColor)}>
            {roleLabel.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {user.firstName ? `${user.firstName} ${user.lastName ?? ''}` : user.email}
            </p>
            <p className="text-xs text-gray-500">{roleLabel}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-error-50 hover:text-error-700 transition-colors"
        >
          <LogOut className="h-4.5 w-4.5" />
          Log Out
        </button>
      </div>
    </>
  );
}
