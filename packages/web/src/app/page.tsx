import { TopNav } from "@/components/TopNav";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { FeaturesGrid } from "@/components/FeaturesGrid";
import { Integrations } from "@/components/Integrations";
import { WhyItMatters } from "@/components/WhyItMatters";
import { Quickstart } from "@/components/Quickstart";
import { Pricing } from "@/components/Pricing";
import { FAQ } from "@/components/FAQ";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <div className="memory-lattice" />
      
      <TopNav />
      
      <main>
        <Hero />
        <HowItWorks />
        <WhyItMatters />
        <FeaturesGrid />
        <Integrations />
        <Quickstart />
        <Pricing />
        <FAQ />
      </main>

      <Footer />
    </div>
  );
}
