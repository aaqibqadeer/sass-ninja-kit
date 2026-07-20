import { CtaSection } from "@/components/marketing/CtaSection";
import { FeatureShowcase } from "@/components/marketing/FeatureShowcase";
import { Hero } from "@/components/marketing/Hero";
import { SiteFooter } from "@/components/shared/SiteFooter";
import { SiteHeader } from "@/components/shared/SiteHeader";

/**
 * Public landing page — the front door of the template and its shareable intro.
 * Deliberately static and auth-free: it must render on any fork (even before a
 * DB/auth provider is configured) and stays SEO-friendly. "Log in" routes
 * visitors into the app, where `AppHeader` takes over the navigation.
 */
export default function Home() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <FeatureShowcase />
        <CtaSection />
      </main>
      <SiteFooter />
    </div>
  );
}
