import { LandingHero } from "./_components/LandingHero";
import { FeatureSection } from "./_components/FeatureSection";
import { ScreenshotShowcase } from "./_components/ScreenshotShowcase";
import { FinalCta } from "./_components/FinalCta";
import { LandingFooter } from "./_components/LandingFooter";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col">
      <LandingHero />
      <FeatureSection />
      <ScreenshotShowcase />
      <FinalCta />
      <LandingFooter />
    </main>
  );
}
