import { Target, Users, Truck, Sparkles } from 'lucide-react';
import { Reveal } from '@/components/ui/Reveal';
import { revealStagger } from '@/utils/reveal';

const pillars = [
  {
    icon: Users,
    title: 'Three-Sided Connection',
    description: 'Customers, businesses, and riders — each with a clear role in the commerce and delivery flow.',
  },
  {
    icon: Truck,
    title: 'Last-Mile Coordination',
    description: 'Structured delivery assignments, pickup verification, and OTP-confirmed delivery.',
  },
  {
    icon: Target,
    title: 'Local-First',
    description: 'Designed for local commerce — connecting nearby businesses with nearby customers.',
  },
  {
    icon: Sparkles,
    title: 'Unified Discovery',
    description: 'One catalogue across multiple businesses. The platform determines the best fulfilling business.',
  },
];

export function AboutSection() {
  return (
    <section id="about" className="py-20 bg-gray-50 scroll-mt-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <Reveal>
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider">About SQUADLINK</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-gray-900 sm:text-4xl">
              Connecting local commerce with reliable delivery
            </h2>
            <div className="mt-6 space-y-4 text-gray-600 leading-relaxed">
              <p>
                SQUADLINK is a local commerce and last-mile delivery coordination
                platform. It connects three key participants — customers who
                need products, businesses that supply them, and riders who
                deliver them.
              </p>
              <p>
                The platform was built to solve a real problem: local
                commerce is often fragmented. Customers struggle to discover
                nearby businesses, businesses lack digital tools for order
                management, and delivery is uncoordinated.
              </p>
              <p>
                SQUADLINK addresses this by providing a unified catalogue, a
                structured order workflow, and coordinated delivery — all
                managed through a single platform with clear state machines
                and real-time tracking.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {pillars.map((p) => {
              const Icon = p.icon;
              return (
                <Reveal key={p.title} delay={revealStagger(pillars.indexOf(p))}>
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-display text-base font-bold text-gray-900">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                    {p.description}
                  </p>
                </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
