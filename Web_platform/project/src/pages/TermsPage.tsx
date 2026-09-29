import { ShieldCheck, Scale, AlertOctagon, CheckCircle2, FileText, ArrowRight, Lock, Building2, Bike } from 'lucide-react';
import { Link } from 'react-router-dom';

export function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Header Breadcrumb & Title */}
        <div className="mb-8">
          <nav className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-3">
            <Link to="/" className="hover:text-primary-600 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-gray-900">Terms of Service</span>
          </nav>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3.5 py-1 text-xs font-bold text-primary-700 mb-3">
            <ShieldCheck className="h-4 w-4 text-primary-600" />
            <span>Legal Compliance & Platform Governance</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            SquadLink Terms of Service
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Effective Date: September 29, 2026 · Governing Jurisdiction: Federal Republic of Nigeria
          </p>
        </div>

        {/* Executive Summary Card */}
        <div className="mb-10 rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-900 via-slate-900 to-primary-950 p-6 sm:p-8 text-white shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/20 border border-primary-400/30">
              <Scale className="h-5 w-5 text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Key Legal Highlights at a Glance</h2>
              <p className="text-xs text-primary-200">The "Coordination Layer" Shield & User Accountability Rules</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-300">
            <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
              <p className="font-semibold text-white mb-1">1. Coordination Layer Only</p>
              <p>SquadLink is strictly a technology platform. We do not manufacture products, prepare food, or employ delivery couriers.</p>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
              <p className="font-semibold text-white mb-1">2. Merchant & Rider Liability</p>
              <p>Merchants are solely liable for product quality and safety; riders are solely liable for roadworthiness and transit safety.</p>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
              <p className="font-semibold text-white mb-1">3. Data Accuracy Warranty</p>
              <p>All users warrant that registered information is true and authentic. Providing false details constitutes intentional breach.</p>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
              <p className="font-semibold text-white mb-1">4. Complete User Indemnification</p>
              <p>Users legally indemnify SquadLink from any damages, legal costs, or liabilities caused by their breach or wrongful conduct.</p>
            </div>
          </div>
        </div>

        {/* Detailed Policy Clauses */}
        <div className="space-y-8 rounded-2xl border border-gray-200 bg-white p-6 sm:p-10 shadow-sm text-gray-800 leading-relaxed text-sm">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-primary-600 font-bold text-xs uppercase tracking-wider">
              <Building2 className="h-4 w-4" />
              <span>Section 1</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              1. Platform Role & Limitation of Liability (The "Coordination Layer" Shield)
            </h2>
            <p>
              <strong>1.1 Technology Intermediary:</strong> SquadLink operates strictly as a digital technology and communications coordination platform connecting independent customers, registered merchant businesses, and freelance delivery riders. SquadLink does not own, operate, or supervise retail merchants, restaurants, grocery outlets, or kitchens, nor does SquadLink manufacture, package, store, or inspect consumer products.
            </p>
            <p>
              <strong>1.2 Independent Contractor Status:</strong> Delivery riders and couriers utilizing the platform are independent freelance contractors and not employees, agents, or joint venturers of SquadLink. SquadLink does not dictate working hours or control vehicular operation.
            </p>
            <p>
              <strong>1.3 Disclaimed Direct Liability:</strong> SquadLink disclaims all direct, indirect, incidental, or consequential liability arising from:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700">
              <li>Product defects, contamination, food safety incidents, expired inventory, or mislabeling originating from participating merchants.</li>
              <li>Traffic infractions, vehicular collisions, delays, or physical transit accidents caused by independent delivery couriers.</li>
              <li>Operational unavailability, ingredient substitutions, or price discrepancies between merchant premises and external listings.</li>
            </ul>
            <p className="bg-amber-50 border-l-4 border-amber-500 p-3 text-xs text-amber-900 rounded-r-lg">
              <strong>Statutory Allocation of Responsibility:</strong> Participating merchants bear sole and exclusive product liability under applicable Nigerian consumer protection and food safety laws (including FCCPC and NAFDAC guidelines). Independent riders bear sole legal responsibility for vehicular licensing, roadworthiness, and personal conduct.
            </p>
          </section>

          <hr className="border-gray-100" />

          {/* Section 2 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-primary-600 font-bold text-xs uppercase tracking-wider">
              <CheckCircle2 className="h-4 w-4" />
              <span>Section 2</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              2. User Representation & Warranty (Accuracy of Information)
            </h2>
            <p>
              <strong>2.1 General Warranty:</strong> All registered actors (Customers, Merchants, and Riders) explicitly warrant that all personal credentials, business names, addresses, phone numbers (+234 format), and financial payout records submitted to SquadLink are accurate, lawful, authentic, and current.
            </p>
            <p>
              <strong>2.2 Business Merchant Warranties:</strong> Businesses listing items in platform or custom catalogs explicitly represent that:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700">
              <li>All listed inventory items are legal, unexpired, safe for human consumption or use, and authorized for commercial trade in Nigeria.</li>
              <li>All displayed prices (₦), photographs, and descriptions accurately depict the actual item delivered to the customer.</li>
              <li>The merchant holds valid trade, health, and local government permits required for operating within their state or campus municipality.</li>
            </ul>
            <p>
              <strong>2.3 Rider Warranties:</strong> Riders explicitly represent and warrant that:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700">
              <li>They possess a valid National Driver's Licence or Rider Permit issued by the Federal Road Safety Corps (FRSC) or relevant state traffic authority.</li>
              <li>Their dispatch motorcycle or tricycle possesses valid commercial registration, third-party road insurance, and roadworthiness certification.</li>
            </ul>
            <p className="bg-red-50 border-l-4 border-red-500 p-3 text-xs text-red-900 rounded-r-lg">
              <strong>Fraudulent Submission Consequences:</strong> Submitting forged credentials, impersonated identities, or illegal items constitutes a material breach of contract, resulting in immediate account termination, forfeiture of pending payouts, and referral to Nigerian law enforcement.
            </p>
          </section>

          <hr className="border-gray-100" />

          {/* Section 3 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-primary-600 font-bold text-xs uppercase tracking-wider">
              <AlertOctagon className="h-4 w-4" />
              <span>Section 3</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              3. Indemnification Clause (Holding Bad Actors Accountable)
            </h2>
            <p>
              <strong>3.1 Complete User Indemnity:</strong> You agree to defend, indemnify, and hold harmless SquadLink, its founding directors, officers, engineers, and platform affiliates from and against any and all claims, liabilities, damages, judgments, losses, costs, and expenses (including reasonable attorney and legal defense fees) arising out of or related to:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700">
              <li>Your breach or violation of any clause of this Agreement or platform guidelines.</li>
              <li>The submission of fraudulent, deceptive, or misleading registration or verification credentials.</li>
              <li>Any physical injury, bodily harm, property damage, or consumer grievance resulting from your acts, omissions, or negligence (whether preparing food, fulfilling orders, or navigating transit).</li>
              <li>Any infringement of third-party intellectual property, privacy, or statutory rights.</li>
            </ul>
            <p>
              <strong>3.2 Legal Enforcement & Prosecution:</strong> SquadLink explicitly reserves the full legal right to institute civil suits against bad actors for financial and reputational damages and to cooperate fully with the Nigeria Police Force, the Economic and Financial Crimes Commission (EFCC), and relevant municipal security agencies.
            </p>
          </section>

          <hr className="border-gray-100" />

          {/* Section 4 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-primary-600 font-bold text-xs uppercase tracking-wider">
              <Lock className="h-4 w-4" />
              <span>Section 4</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              4. Pre-Payment, Escrow Holding & Double-Entry Financial Safeguards
            </h2>
            <p>
              <strong>4.1 Secure Holding State:</strong> Customers acknowledge that checkout payments are placed into a protected pre-payment holding state until delivery fulfillment verification occurs via dual verification OTP or merchant/rider delivery handoff.
            </p>
            <p>
              <strong>4.2 Order Cancellation Before Payment:</strong> Customers are legally entitled to cancel pending orders at any time prior to payment initialization without penalty or financial charge. Upon pre-payment cancellation, reserved merchant inventory is instantaneously released.
            </p>
            <p>
              <strong>4.3 Double-Entry Ledger Governance:</strong> All financial transactions, rider delivery earnings, merchant disbursements, and customer refunds are strictly regulated by SquadLink's automated double-entry ledger. Withdrawals requested by riders or customers undergo administrative validation and are paid into verified Nigerian bank accounts matching the registrant's name.
            </p>
          </section>

          <hr className="border-gray-100" />

          {/* Section 5 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-primary-600 font-bold text-xs uppercase tracking-wider">
              <FileText className="h-4 w-4" />
              <span>Section 5</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              5. Account Security, Rate-Limiting & Identity Governance
            </h2>
            <p>
              <strong>5.1 Unique Usernames:</strong> Each account is assigned or customizes a unique `@username` preventing identity confusion and impersonation.
            </p>
            <p>
              <strong>5.2 7-Day Profile Edit Lock:</strong> To prevent deceptive identity cycling or credential swapping, profile edits (username, contact information, avatar) are rate-limited to once every seven (7) calendar days.
            </p>
            <p>
              <strong>5.3 Account Recovery Restrictions:</strong> Password reset and account recovery workflows are strictly restricted to accounts possessing at least one confirmed, verified channel (verified email or verified Nigerian phone number).
            </p>
          </section>

          <hr className="border-gray-100" />

          {/* Section 6 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-primary-600 font-bold text-xs uppercase tracking-wider">
              <Scale className="h-4 w-4" />
              <span>Section 6</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              6. Governing Law & Dispute Resolution
            </h2>
            <p>
              This Agreement shall be interpreted and governed in accordance with the substantive laws of the <strong>Federal Republic of Nigeria</strong>. Any disputes arising between users and SquadLink that cannot be resolved through amicable direct negotiation shall be submitted to the exclusive jurisdiction of the competent courts in Nigeria.
            </p>
          </section>
        </div>

        {/* Bottom Navigation */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-200 pt-6 text-sm text-gray-600">
          <p>Questions regarding these terms? Contact legal at <a href="mailto:contact.sqadlink@gmail.com" className="text-primary-600 font-semibold underline">contact.sqadlink@gmail.com</a></p>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="text-primary-600 font-semibold hover:underline">
              View Privacy Policy &rarr;
            </Link>
            <Link to="/register" className="rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white hover:bg-primary-700 transition">
              Back to Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
