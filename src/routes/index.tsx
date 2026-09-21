import { createFileRoute } from "@tanstack/react-router";
import { useReveal } from "@/hooks/use-reveal";
import { GlobeBackground } from "@/components/landing/GlobeBackground";
import { Preloader } from "@/components/landing/Preloader";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { Stats } from "@/components/landing/Stats";
import { PlatformSection, SecuritySection, StudioSection, WorkspaceSection } from "@/components/landing/Sections";
import { ThemePicker } from "@/components/landing/ThemePicker";
import { Sandbox } from "@/components/landing/Sandbox";
import { Testimonials } from "@/components/landing/Testimonials";
import { Footer } from "@/components/landing/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Opera AI — Build at the speed of orbit" },
      { name: "description", content: "Opera AI: a spatial AI ecosystem with a 3D Earth landing, 100-palette color engine, AI chat workspace, cloud IDE and creative studio. Developed by Mahgoub Abdallah Mohammed Osman." },
      { property: "og:title", content: "Opera AI — Build at the speed of orbit" },
      { property: "og:description", content: "Cloud intelligence, immersive 3D environments, enterprise-grade security and multi-modal creation by Opera AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  useReveal();
  return (
    <div className="relative">
      <Preloader />
      <GlobeBackground />
      <Nav />
      <main className="relative z-10">
        <Hero />
        <Stats />
        <PlatformSection />
        <WorkspaceSection />
        <SecuritySection />
        <StudioSection />
        <ThemePicker />
        <Sandbox />
        <Testimonials />
      </main>
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
