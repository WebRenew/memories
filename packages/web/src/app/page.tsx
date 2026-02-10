import { TopNav } from "@/components/TopNav";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { FeaturesGrid } from "@/components/FeaturesGrid";
import { SDKSection } from "@/components/SDKSection";
import { Integrations } from "@/components/Integrations";
import { Pricing } from "@/components/Pricing";
import { FAQ } from "@/components/FAQ";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      
      <TopNav />
      
      <main className="relative">
        <Hero />
        <HowItWorks />
        <FeaturesGrid />
        <SDKSection />
        <Integrations />
        <Pricing />
        <FAQ />
      </main>

      <Footer />
    </div>
  );
}
