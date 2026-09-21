import { ArrowDown, ArrowRight, Sparkle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { OperaLogo3D } from "@/components/brand/OperaLogo3D";

export function Hero() {
  return (
    <section id="top" className="relative flex min-h-[100svh] items-center px-4 pt-28 pb-16">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="text-center lg:text-left">
          <div className="reveal is-visible inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <Sparkle className="h-3.5 w-3.5 text-primary" />
            A next-generation spatial AI ecosystem
          </div>
          <h1 className="mt-6 text-5xl font-extrabold leading-[0.98] sm:text-6xl lg:text-7xl xl:text-8xl">
            Build at the
            <br />
            <span className="text-gradient text-glow">speed of orbit.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg lg:mx-0">
            Opera AI unifies cloud intelligence, an immersive 3D workspace, enterprise-grade security and a
            multi-modal creation studio — one platform, one hundred moods.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Link to="/chat" className="btn-hero">
              Start
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#sandbox" className="btn-ghost">
              Try the AI sandbox
            </a>
            <a href="#platform" className="btn-ghost">
              Explore the platform
              <ArrowDown className="h-4 w-4" />
            </a>
          </div>
          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground/70">
            Engineered by Mahgoub Abdallah Mohammed Osman
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-sm lg:max-w-md">
          <div className="absolute inset-0 -m-6 rounded-full bg-primary/25 blur-3xl animate-pulse-glow" />
          <OperaLogo3D />
          <div className="absolute -left-4 top-10 glass rounded-2xl px-3 py-2 font-mono text-[11px] animate-float-slow">
            <span className="text-primary">$</span> opera deploy --orbit
          </div>
          <div className="absolute -right-2 bottom-16 glass rounded-2xl px-3 py-2 font-mono text-[11px] animate-float [animation-delay:-3s]">
            ✓ intelligence in motion
          </div>
        </div>
      </div>

      <a
        href="#platform"
        aria-label="Scroll to explore"
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-muted-foreground/70 transition-colors hover:text-foreground"
      >
        <ArrowDown className="h-5 w-5 animate-bounce" />
      </a>
    </section>
  );
}
