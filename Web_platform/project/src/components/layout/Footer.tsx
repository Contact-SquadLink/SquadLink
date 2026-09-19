import { Link } from 'react-router-dom';
import { ShoppingBag, Store, Bike, User, Mail, Phone, MapPin } from 'lucide-react';

const footerSections = [
  {
    title: 'Customers',
    links: [
      { label: 'Browse Products', path: '/browse' },
      { label: 'How It Works', path: '/#how-it-works' },
      { label: 'Create Account', path: '/register' },
      { label: 'Track Order', path: '/login' },
    ],
  },
  {
    title: 'Businesses',
    links: [
      { label: 'Partner With Us', path: '/register?intent=business' },
      { label: 'Business Dashboard', path: '/login' },
      { label: 'How It Works', path: '/#how-it-works' },
      { label: 'FAQ', path: '/faq' },
    ],
  },
  {
    title: 'Riders',
    links: [
      { label: 'Become a Rider', path: '/contact' },
      { label: 'Rider Dashboard', path: '/login' },
      { label: 'How It Works', path: '/#how-it-works' },
      { label: 'FAQ', path: '/faq' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', path: '/about' },
      { label: 'FAQ', path: '/faq' },
      { label: 'Contact', path: '/contact' },
      { label: 'Privacy Policy', path: '/#privacy' },
      { label: 'Terms of Service', path: '/#terms' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-6">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <span className="font-display text-lg font-bold tracking-tight text-white">
                SQUAD<span className="text-primary-400">LINK</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-gray-400 max-w-xs">
              Connecting customers, local businesses, and delivery riders for
 seamless local commerce and reliable last-mile delivery.
            </p>
            <div className="mt-5 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-400">
                <Mail className="h-4 w-4 text-primary-400" />
                <span>hello@squadlink.example</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Phone className="h-4 w-4 text-primary-400" />
                <span>+234 800 SQUADLINK</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <MapPin className="h-4 w-4 text-primary-400" />
                <span>Nigeria</span>
              </div>
            </div>
          </div>

          {/* Link sections */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="mb-4 text-sm font-semibold text-white">{section.title}</h3>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.path}
                      className="text-sm text-gray-400 hover:text-primary-400 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-gray-800 pt-8 sm:flex-row">
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link to="/#privacy" className="hover:text-gray-300">Privacy Policy</Link>
            <Link to="/#terms" className="hover:text-gray-300">Terms of Service</Link>
          </div>
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} SQUADLINK. All rights reserved.
          </p>
        </div>

        <div className="mt-6 flex items-center gap-2 text-xs text-gray-600">
          <User className="h-3.5 w-3.5" />
          <span>Customers</span>
          <Store className="h-3.5 w-3.5 ml-3" />
          <span>Businesses</span>
          <Bike className="h-3.5 w-3.5 ml-3" />
          <span>Riders</span>
        </div>
      </div>
    </footer>
  );
}
