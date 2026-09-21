import type { LucideIcon } from "lucide-react";
import {
  Brain, Code2, Fingerprint, GitBranch, Image as ImageIcon, KeyRound, Layers, Lock, Mic, Orbit,
  Play, ScanEye, ShieldCheck, Sparkles, TerminalSquare, Wand2,
} from "lucide-react";
import { OperaLogoMark } from "@/components/brand/OperaLogoMark";

type Feature = { icon: LucideIcon; title: string; body: string; tip?: string };

function FeatureGrid({ items }: { items: Feature[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((f, i) => (
        <article
          key={f.title}
          className={`feature-card reveal reveal-delay-${(i % 3) + 1} glass group rounded-3xl p-6`}
          title={f.tip}
        >
          <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30 transition-transform group-hover:scale-110">
            <f.icon className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-bold">{f.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
        </article>
      ))}
    </div>
  );
}

function BrandSays({ children, flip = false }: { children: React.ReactNode; flip?: boolean }) {
  return (
    <div className={`reveal flex items-end gap-4 ${flip ? "flex-row-reverse" : ""}`}>
      <OperaLogoMark className="h-20 w-20 shrink-0 sm:h-28 sm:w-28" label="Opera AI" />
      <div className={`glass-strong relative max-w-md rounded-3xl px-5 py-4 text-sm leading-relaxed ${flip ? "rounded-br-md" : "rounded-bl-md"}`}>
        {children}
      </div>
    </div>
  );
}

function SectionHead({ kicker, title, body }: { kicker: string; title: string; body: string }) {
  return (
    <div className="reveal mx-auto mb-12 max-w-2xl text-center">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">{kicker}</p>
      <h2 className="mt-3 text-3xl font-extrabold sm:text-5xl">{title}</h2>
      <p className="mt-4 text-muted-foreground">{body}</p>
    </div>
  );
}

export function PlatformSection() {
  return (
    <section id="platform" className="relative px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHead
          kicker="01 — Architecture"
          title="One ecosystem. Five orbits."
          body="Authentication, spatial UI, conversational intelligence, a live code workspace and a creative studio — twenty features in each, one hundred in total."
        />
        <div className="mb-12 flex justify-center">
          <BrandSays>
            Meet Opera AI: one intelligent core connecting every layer — from conversational tools to the image studio.
          </BrandSays>
        </div>
        <FeatureGrid
          items={[
            { icon: Orbit, title: "Spatial landing experience", body: "A real-time WebGL Earth, orbital code fragments and cursor-reactive parallax layers set the stage.", tip: "Three.js + React Three Fiber, low-power mode on mobile" },
             { icon: Brain, title: "Multi-model chat engine", body: "Streaming responses, thinking indicators and a focused assistant identity that responds while the model works." },
            { icon: Code2, title: "Cloud IDE workspace", body: "File tree, multi-tab editor, browser sandbox and a live terminal — split-screen with the assistant." },
            { icon: ImageIcon, title: "Creative studio", body: "Text-to-image, inpainting, outpainting, batch runs and a community gallery with one-click prompt copying." },
            { icon: ShieldCheck, title: "Enterprise-grade security", body: "OTP verification, hashed credentials, session tracking and role-based access control from day one." },
            { icon: Layers, title: "100-palette color engine", body: "Every token — buttons, borders, glows, glass — re-harmonises instantly when you pick a new mood." },
          ]}
        />
      </div>
    </section>
  );
}

export function WorkspaceSection() {
  return (
    <section id="workspace" className="relative px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHead
          kicker="02 — Developer tools"
          title="Chat on the left. Code on the right."
          body="A workspace that thinks with you: refactor selections, fix bugs in one click and run snippets without leaving the page."
        />
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="reveal relative order-2 lg:order-1">
            <div className="glass-strong overflow-hidden rounded-3xl">
              <div className="flex items-center gap-1.5 border-b border-glass-border px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-accent/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-primary/70" />
                <span className="ml-3 font-mono text-[11px] text-muted-foreground">orbit.ts — Opera Workspace</span>
              </div>
              <pre className="overflow-x-auto p-5 font-mono text-[12px] leading-relaxed text-foreground/90">
{`import { opera } from "@opera/sdk";

const agent = await opera.agent("core");
const answer = await agent.ask("/optimize", {
  file: "globe.ts",
  goal: "60fps on mobile",
});

console.log(answer.diff);   // ✓ 3 hunks
console.log(answer.tokens); // 1,284`}
              </pre>
              <div className="border-t border-glass-border bg-space-deep/60 p-4 font-mono text-[11px]">
                <p className="text-muted-foreground">› running sandbox…</p>
                <p className="text-primary">✓ 3 hunks applied · 1,284 tokens · 41ms</p>
                <p className="text-foreground/80">
                  ▮<span className="animate-blink">_</span>
                </p>
              </div>
            </div>
            <OperaLogoMark className="absolute -bottom-10 -right-6 hidden h-44 w-44 sm:block" label="Opera AI" />
          </div>
          <div className="order-1 lg:order-2">
            <FeatureGrid
              items={[
                { icon: TerminalSquare, title: "Live terminal", body: "Stdout, errors and return values stream into a bottom panel in real time." },
                { icon: Wand2, title: "AI refactor & fix", body: "Select code, command /fix or /optimize, get a patch with an inline explanation." },
                { icon: GitBranch, title: "Git hooks & ZIP export", body: "Track milestones and download entire projects as an archive." },
                { icon: Play, title: "JS & Python runtime", body: "Execute scripts in a secure browser sandbox — no server round-trips." },
              ]}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export function SecuritySection() {
  return (
    <section id="security" className="relative px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHead
          kicker="03 — Security protocols"
          title="Locked like a launch bay."
          body="Real accounts, real verification. Every session is tracked, every credential hashed, every role checked server-side."
        />
        <div className="mb-12 flex justify-center">
          <BrandSays flip>
            Six-digit codes land in your inbox in seconds, and you can see — and revoke — every device that's
            logged in. Opera AI keeps control visible and close at hand.
          </BrandSays>
        </div>
        <FeatureGrid
          items={[
            { icon: KeyRound, title: "OTP verification", body: "Six-box code entry with auto-focus, delivered instantly by email." },
            { icon: Lock, title: "Hashed credentials", body: "Passwords never stored in plain text; secure, HTTP-only session cookies." },
            { icon: Fingerprint, title: "Active sessions tracker", body: "See every device and browser, and terminate any of them remotely." },
            { icon: ScanEye, title: "Login audit ledger", body: "Timestamps, IP addresses and browser signatures for every sign-in." },
            { icon: ShieldCheck, title: "Role-based access", body: "Standard, premium developer and administrator tiers enforced on the server." },
            { icon: Sparkles, title: "2FA ready", body: "Architectural hooks in place for authenticator-app layers." },
          ]}
        />
      </div>
    </section>
  );
}

export function StudioSection() {
  const presets = ["Anime", "Cyberpunk", "3D Realistic", "Cinematic", "Oil Painting", "Isometric"];
  return (
    <section id="studio" className="relative px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHead
          kicker="04 — Creative studio"
          title="Describe it. Watch it appear."
          body="A generative pipeline with style presets, aspect ratios, negative prompts, seed control and a full community gallery."
        />
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="reveal glass-strong rounded-3xl p-6">
            <label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Prompt</label>
            <p className="mt-2 rounded-2xl bg-space-deep/60 p-4 font-mono text-sm text-foreground/90">
              an orbital research station drifting past a glowing nebula, cinematic lighting, ultra-detailed
              <span className="animate-blink">▍</span>
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {presets.map((p, i) => (
                <span key={p} className={`rounded-full px-3 py-1 text-xs ${i === 3 ? "bg-primary text-primary-foreground shadow-glow" : "glass text-muted-foreground"}`}>
                  {p}
                </span>
              ))}
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="aspect-square overflow-hidden rounded-2xl ring-1 ring-glass-border">
                  <div className={`h-full w-full bg-gradient-to-br ${i === 0 ? "from-primary/70 via-accent/40 to-space-deep" : i === 1 ? "from-accent/60 via-primary/30 to-space-deep" : "from-space-deep via-primary/40 to-accent/60"} animate-shimmer bg-[length:200%_200%]`} />
                </div>
              ))}
            </div>
          </div>
          <FeatureGrid
            items={[
              { icon: Wand2, title: "Inpaint & outpaint", body: "Regenerate regions or extend the canvas with seamless continuations." },
              { icon: ImageIcon, title: "Community gallery", body: "Discover creations and copy prompts into your own studio." },
              { icon: Mic, title: "Voice & speech", body: "Dictate prompts, and let the assistant read results aloud." },
              { icon: Layers, title: "Style mix matrix", body: "Combine modifiers into unique experimental aesthetics." },
            ]}
          />
        </div>
      </div>
    </section>
  );
}
