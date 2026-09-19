import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/format';

interface FAQItem {
  category: string;
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    category: 'Customers',
    question: 'What is SQUADLINK?',
    answer: 'SQUADLINK is a local commerce and delivery platform that connects customers, local businesses, and delivery riders. You browse a unified catalogue, place an order, and a rider delivers it to you.',
  },
  {
    category: 'Customers',
    question: 'How do I place an order?',
    answer: 'Browse the catalogue, add products to your cart, and proceed to checkout. You will need to create an account or log in to complete your order. The platform determines the fulfilling business based on availability and location.',
  },
  {
    category: 'Customers',
    question: 'Do I need an account to browse?',
    answer: 'No. You can browse the catalogue, search products, and add items to a temporary cart without creating an account. You only need to log in when you proceed to checkout.',
  },
  {
    category: 'Customers',
    question: 'When do I need to log in?',
    answer: 'Authentication is required when you proceed to checkout to place an order. Until then, you can browse and build your cart freely as a guest.',
  },
  {
    category: 'Customers',
    question: 'Can I add items from different businesses?',
    answer: 'You browse a unified catalogue and add products to a single cart. The platform determines which business fulfils each order — you do not manually choose a specific business.',
  },
  {
    category: 'Customers',
    question: 'How is my order fulfilled?',
    answer: 'After you place an order, the platform assigns it to a qualifying business. The business accepts, prepares, and marks it ready. A rider is then assigned, picks up the order, and delivers it to you.',
  },
  {
    category: 'Customers',
    question: 'How do I track my order?',
    answer: 'Once your order is placed, you can track its status through the order tracking page. The status progresses through: Pending, Confirmed, Preparing, Ready for Pickup, Out for Delivery, and Delivered.',
  },
  {
    category: 'Customers',
    question: 'How does delivery confirmation work?',
    answer: 'When the rider arrives at your location, you confirm delivery with an OTP. The rider initiates the OTP, you enter it, and the delivery is confirmed.',
  },
  {
    category: 'Businesses',
    question: 'How can my business join?',
    answer: 'You can start by creating an account through the registration page. Business onboarding and verification follow the platform\'s actual workflow. Contact the team for business-specific onboarding details.',
  },
  {
    category: 'Businesses',
    question: 'How does business verification work?',
    answer: 'After registration, businesses go through a verification process managed by platform administrators. The verification status is visible in the business dashboard.',
  },
  {
    category: 'Businesses',
    question: 'How do businesses receive orders?',
    answer: 'When a customer places an order that your business qualifies to fulfil, you receive it in your business dashboard. You can accept, prepare, and mark orders ready for pickup.',
  },
  {
    category: 'Businesses',
    question: 'How do businesses manage products and inventory?',
    answer: 'The business dashboard provides catalogue and inventory management features where supported by the backend. You can view and manage your products, prices, and stock levels.',
  },
  {
    category: 'Riders',
    question: 'How can I become a rider?',
    answer: 'You can start by creating an account through the registration page. Rider onboarding follows the platform\'s actual authentication and registration model.',
  },
  {
    category: 'Riders',
    question: 'How are deliveries assigned?',
    answer: 'When an order is ready for pickup, the platform searches for an available rider. Assignments are made based on the rider\'s availability status and the delivery requirements.',
  },
  {
    category: 'Riders',
    question: 'How is pickup verified?',
    answer: 'Riders verify pickup from the business through a dedicated pickup verification step. This is separate from the customer delivery OTP.',
  },
  {
    category: 'Riders',
    question: 'How is delivery confirmed?',
    answer: 'Upon arrival, the rider initiates an OTP. The customer enters the OTP to confirm delivery. This two-step verification ensures the order reaches the right person.',
  },
];

const categories = ['All', 'Customers', 'Businesses', 'Riders'];

export function FAQPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const filtered =
    activeCategory === 'All'
      ? faqItems
      : faqItems.filter((i) => i.category === activeCategory);

  return (
    <div className="bg-white min-h-screen">
      <section className="bg-gradient-to-b from-primary-50 to-white py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider">FAQ</p>
          <h1 className="mt-3 font-display text-4xl font-bold text-gray-900">
            Frequently Asked Questions
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Everything you need to know about SQUADLINK.
          </p>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  setOpenIndex(null);
                }}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                  activeCategory === cat
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filtered.map((item, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div
                  key={`${item.category}-${item.question}`}
                  className="rounded-xl border border-gray-200 bg-white overflow-hidden"
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="text-sm font-semibold text-gray-900 sm:text-base">
                      {item.question}
                    </span>
                    <ChevronDown
                      className={cn(
                        'h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200',
                        isOpen && 'rotate-180 text-primary-600'
                      )}
                    />
                  </button>
                  <div
                    className={cn(
                      'grid transition-all duration-200',
                      isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 pb-4 text-sm leading-relaxed text-gray-600">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
