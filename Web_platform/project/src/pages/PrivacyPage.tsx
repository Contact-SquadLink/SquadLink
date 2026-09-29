import { Shield, Eye, Lock, Database, Cookie, CheckCircle2, UserCheck, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Header Breadcrumb & Title */}
        <div className="mb-8">
          <nav className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-3">
            <Link to="/" className="hover:text-primary-600 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-gray-900">Privacy Policy</span>
          </nav>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-800 mb-3">
            <Shield className="h-4 w-4 text-emerald-600" />
            <span>NDPA & Nigerian Data Protection Compliance</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            SquadLink Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Effective Date: September 29, 2026 · Committed to transparency and digital safety
          </p>
        </div>

        {/* Privacy Principles Card */}
        <div className="mb-10 rounded-2xl border border-emerald-200 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-6 sm:p-8 text-white shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-400/30">
              <Lock className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Our Core Privacy Commitments</h2>
              <p className="text-xs text-emerald-200">How your personal, geolocation, and transaction data is handled</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-300">
            <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
              <p className="font-semibold text-white mb-1">1. Courier Privacy Gating</p>
              <p>Rider contact and vehicle details remain strictly hidden from customers until the rider explicitly accepts the delivery assignment.</p>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
              <p className="font-semibold text-white mb-1">2. Localized Nigerian Number Format</p>
              <p>Phone numbers are validated under the standard +234 10-digit framework to prevent unauthorized spam and duplicate accounts.</p>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
              <p className="font-semibold text-white mb-1">3. Minimal Geolocation Usage</p>
              <p>Exact PostGIS GPS coordinates are collected solely to calculate hyper-local delivery fees and direct riders along optimal routes.</p>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
              <p className="font-semibold text-white mb-1">4. Robust Verification Security</p>
              <p>One-Time Passwords (OTPs) securely confirm email and phone ownership, safeguarding account recovery workflows.</p>
            </div>
          </div>
        </div>

        {/* Detailed Privacy Sections */}
        <div className="space-y-8 rounded-2xl border border-gray-200 bg-white p-6 sm:p-10 shadow-sm text-gray-800 leading-relaxed text-sm">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-emerald-600 font-bold text-xs uppercase tracking-wider">
              <Database className="h-4 w-4" />
              <span>Section 1</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">1. Information We Collect</h2>
            <p>
              When you interact with the SquadLink platform, we collect information necessary to facilitate hyperlocal delivery coordination and maintain account security:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-gray-700">
              <li><strong>Personal Profile Data:</strong> Full name, unique `@username`, email address, verified Nigerian mobile phone number (+234), and profile avatar.</li>
              <li><strong>Merchant Business Data:</strong> Business name, operating address, category, business hours, menu/catalog items, pricing, and bank payout credentials.</li>
              <li><strong>Rider Verification Data:</strong> Driver's licence/permit, vehicle type (motorcycle/tricycle), registration number, and bank account for withdrawal settlements.</li>
              <li><strong>Location & Geodata:</strong> Delivery destination address, landmark, and device GPS latitude/longitude for precise dispatch calculation.</li>
              <li><strong>Financial Transactions:</strong> Order item totals, delivery fees, double-entry ledger entries, withdrawal requests, and payment reference tokens (we do not store raw debit card numbers).</li>
            </ul>
          </section>

          <hr className="border-gray-100" />

          {/* Section 2 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-emerald-600 font-bold text-xs uppercase tracking-wider">
              <Eye className="h-4 w-4" />
              <span>Section 2</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">2. Courier Privacy Gating & Operational Disclosures</h2>
            <p>
              SquadLink implements strict two-way privacy controls between customers, merchants, and riders:
            </p>
            <p>
              <strong>2.1 Before Assignment Acceptance:</strong> When an order is created, nearby eligible riders receive an anonymous dispatch broadcast. The customer cannot view the rider's personal name, phone number, or vehicle registration until a rider officially accepts the task.
            </p>
            <p>
              <strong>2.2 After Assignment Acceptance:</strong> Once accepted, the customer and merchant are provided with the rider's first name, unique `@username`, direct phone contact, and vehicle details to facilitate seamless pickup and arrival coordination.
            </p>
          </section>

          <hr className="border-gray-100" />

          {/* Section 3 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-emerald-600 font-bold text-xs uppercase tracking-wider">
              <Cookie className="h-4 w-4" />
              <span>Section 3</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">3. Cookies & Local Storage Policy</h2>
            <p>
              SquadLink utilizes cookies, session tokens, and browser local storage for essential security and convenience features:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-gray-700">
              <li><strong>Authentication Tokens (`accessToken`):</strong> Stored securely to maintain your signed-in state across browser sessions and verify your identity on protected API endpoints.</li>
              <li><strong>Cart & Order Drafts:</strong> Saved locally to prevent cart loss if your browser is refreshed or disconnected unexpectedly.</li>
              <li><strong>Cookie Consent Preferences:</strong> Saved in `squadlink_cookie_consent` to remember whether you accepted persistent authentication and session settings.</li>
            </ul>
            <p>
              You can clear cookies or storage at any time via your browser settings; however, doing so will log you out of active platform sessions.
            </p>
          </section>

          <hr className="border-gray-100" />

          {/* Section 4 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-emerald-600 font-bold text-xs uppercase tracking-wider">
              <UserCheck className="h-4 w-4" />
              <span>Section 4</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">4. Data Retention, Security & User Rights</h2>
            <p>
              Under the <strong>Nigeria Data Protection Act (NDPA)</strong>, users possess the right to access, rectify, and safeguard their digital identity.
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-gray-700">
              <li><strong>Password Security:</strong> Passwords are encrypted using high-work-factor bcrypt hashing with 12 salt rounds and are never stored in plaintext.</li>
              <li><strong>7-Day Profile Editing Window:</strong> Usernames and identity details may be updated once every 7 days from the Profile section to maintain integrity and prevent fraudulent identity shifting.</li>
              <li><strong>Verification Integrity:</strong> Email and phone numbers require 6-digit OTP verification. Unverified accounts cannot initiate automated password resets.</li>
            </ul>
          </section>

          <hr className="border-gray-100" />

          {/* Section 5 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-emerald-600 font-bold text-xs uppercase tracking-wider">
              <Shield className="h-4 w-4" />
              <span>Section 5</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">5. Law Enforcement Cooperation</h2>
            <p>
              SquadLink does not sell or rent personal information to third-party advertisers. We may disclose verified transaction logs, geolocation records, or identity credentials only when strictly required by lawful subpoena, court order, or official investigation by the Nigeria Police Force or certified regulatory bodies.
            </p>
          </section>
        </div>

        {/* Bottom Navigation */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-200 pt-6 text-sm text-gray-600">
          <p>Privacy inquiries? Email our data protection officer at <a href="mailto:contact.sqadlink@gmail.com" className="text-emerald-700 font-semibold underline">contact.sqadlink@gmail.com</a></p>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="text-emerald-700 font-semibold hover:underline">
              View Terms of Service &rarr;
            </Link>
            <Link to="/register" className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition">
              Back to Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
