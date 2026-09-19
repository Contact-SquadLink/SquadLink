import {
  HeroSection,
} from '@/components/home/HeroSection';
import { HowItWorksSection } from '@/components/home/HowItWorksSection';
import { PublicCatalogSection } from '@/components/home/PublicCatalogSection';
import { WhySquadlinkSection } from '@/components/home/WhySquadlinkSection';
import { BusinessCTASection, RiderCTASection } from '@/components/home/CTASections';
import { AboutSection } from '@/components/home/AboutSection';
import { FAQSection } from '@/components/home/FAQSection';
import { ContactSection } from '@/components/home/ContactSection';

export function HomePage() {
  return (
    <>
      <HeroSection />
      <HowItWorksSection />
      <PublicCatalogSection />
      <WhySquadlinkSection />
      <BusinessCTASection />
      <RiderCTASection />
      <AboutSection />
      <FAQSection />
      <ContactSection />
    </>
  );
}
