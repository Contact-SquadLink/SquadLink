import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  ShoppingCart,
  ChevronRight,
  LogOut,
  User as UserIcon,
  LayoutDashboard,
  ShoppingBag,
} from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/format';
import { LoginModal } from '@/components/auth/LoginModal';

const navLinks = [
  { label: 'Home', path: '/', sectionId: 'hero' },
  { label: 'Browse', path: '/browse' },
  { label: 'How It Works', path: '/#how-it-works', sectionId: 'how-it-works' },
  { label: 'About Us', path: '/about', sectionId: 'about' },
  { label: 'FAQ', path: '/faq', sectionId: 'faq' },
  { label: 'Contact', path: '/contact', sectionId: 'contact' },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { itemCount } = useCart();
  const { user, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    link: { label: string; path: string; sectionId?: string }
  ) => {
    if (link.path === '/') {
      if (location.pathname === '/') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    if (link.sectionId && location.pathname === '/') {
      const el = document.getElementById(link.sectionId);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.history.pushState(null, '', `#${link.sectionId}`);
      }
    }
  };

  const dashboardPath = user
    ? user.role === 'SUPER_ADMIN'
      ? '/admin/control-center'
      : user.role === 'ADMIN'
        ? '/admin'
        : user.role === 'BUSINESS_USER'
          ? '/business'
          : user.role === 'RIDER'
            ? '/rider'
            : '/dashboard'
    : '/login';

  const ordersPath = user
    ? user.role === 'BUSINESS_USER'
      ? '/business/orders'
      : user.role === 'RIDER'
        ? '/rider'
        : '/orders'
    : '/login';

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-50 transition-all duration-300',
          scrolled
            ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100'
            : 'bg-white border-b border-transparent'
        )}
      >
        <div className="mx-auto flex h-18 sm:h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link
            to="/"
            onClick={(e) => {
              if (location.pathname === '/') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="flex items-center gap-3 shrink-0 group py-1"
          >
            <img
              src="/squadlink-logo.png"
              alt="SquadLink"
              className="h-11 w-11 sm:h-13 sm:w-13 object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105"
            />
            <span className="font-display text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
              SQUAD<span className="text-primary-600">LINK</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={(e) => handleNavClick(e, link)}
                className="px-3.5 py-2 text-sm font-medium text-gray-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop actions */}
          <div className="hidden lg:flex items-center gap-3">
            <Link
              to="/cart"
              className="relative flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="View cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary-500 px-1 text-xs font-bold text-secondary-950">
                  {itemCount}
                </span>
              )}
            </Link>

            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-bold">
                    {(user.firstName || user.email || '').charAt(0).toUpperCase()}
                  </div>
                  <span className="max-w-24 truncate">
                    {user.firstName || user.email}
                  </span>
                  <ChevronRight className={cn('h-4 w-4 text-gray-400 transition-transform', userMenuOpen && 'rotate-90')} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-gray-100 bg-white py-2 shadow-lg animate-slide-down">
                    <Link
                      to="/profile"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <UserIcon className="h-4 w-4 text-gray-400" />
                      Profile
                    </Link>
                    <Link
                      to={dashboardPath}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <LayoutDashboard className="h-4 w-4 text-gray-400" />
                      Dashboard
                    </Link>
                    <Link
                      to={ordersPath}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <ShoppingBag className="h-4 w-4 text-gray-400" />
                      My Orders
                    </Link>
                    <div className="my-1 border-t border-gray-100" />
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-error-600 hover:bg-error-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setLoginModalOpen(true)}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 hover:text-primary-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Log In
                </button>
                <Link
                  to="/register"
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-primary-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

        {/* Mobile actions */}
        <div className="flex lg:hidden items-center gap-2">
          <Link
            to="/cart"
            className="relative flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="View cart"
          >
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary-500 px-1 text-xs font-bold text-secondary-950">
                {itemCount}
              </span>
            )}
          </Link>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white animate-slide-down">
          <nav className="mx-auto max-w-7xl px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={(e) => {
                  handleNavClick(e, link);
                  setMobileOpen(false);
                }}
                className="flex items-center justify-between rounded-lg px-3 py-3 text-base font-medium text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition-colors"
              >
                {link.label}
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </Link>
            ))}
            <div className="pt-3 mt-3 border-t border-gray-100 space-y-2">
              {isAuthenticated ? (
                <>
                  <Link
                    to={dashboardPath}
                    onClick={() => setMobileOpen(false)}
                    className="block w-full rounded-lg px-3 py-3 text-center text-base font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 transition-colors"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to={ordersPath}
                    onClick={() => setMobileOpen(false)}
                    className="block w-full rounded-lg px-3 py-3 text-center text-base font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    My Orders
                  </Link>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      handleLogout();
                    }}
                    className="block w-full rounded-lg px-3 py-3 text-center text-base font-semibold text-error-600 border border-error-200 hover:bg-error-50 transition-colors"
                  >
                    Log Out
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      setLoginModalOpen(true);
                    }}
                    className="block w-full rounded-lg px-3 py-3 text-center text-base font-semibold text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    Log In
                  </button>
                  <Link
                    to="/register"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full rounded-lg bg-primary-600 px-3 py-3 text-center text-base font-semibold text-white hover:bg-primary-700 transition-colors"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>

    <LoginModal
      isOpen={loginModalOpen}
      onClose={() => setLoginModalOpen(false)}
    />
  </>
  );
}
