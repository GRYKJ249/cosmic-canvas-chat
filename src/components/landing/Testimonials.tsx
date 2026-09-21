import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const items = [
  { quote: "The split-screen workspace changed how I debug. I talk to the assistant, it patches the file, the terminal confirms. Done.", name: "Amina K.", role: "Full-stack developer, beta cohort" },
  { quote: "I switched palettes forty times in the first ten minutes. Every single one felt intentional — that never happens.", name: "Diego R.", role: "Product designer" },
  { quote: "OTP verification, session revocation, audit logs — this is the first AI playground I'd let my team log into.", name: "Priya S.", role: "Security engineer" },
  { quote: "The dimensional Opera mark moving above a real planet makes the whole product feel like a serious new company.", name: "Tomás L.", role: "Indie hacker" },
];

export function Testimonials() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % items.length), 6000);
    return () => clearInterval(id);
  }, []);
  const t = items[i] ?? items[0]!;
  return (
    <section className="relative px-4 py-24">
      <div className="mx-auto max-w-3xl">
        <div className="reveal mx-auto mb-10 max-w-2xl text-center">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">07 — Community</p>
          <h2 className="mt-3 text-3xl font-extrabold sm:text-5xl">Words from early explorers.</h2>
        </div>
        <div className="reveal glass-strong relative rounded-3xl p-8 sm:p-12">
          <p key={i} className="animate-in fade-in slide-in-from-bottom-2 duration-500 text-lg leading-relaxed sm:text-2xl">
            “{t.quote}”
          </p>
          <div className="mt-6 flex items-center justify-between">
            <div>
              <p className="font-semibold">{t.name}</p>
              <p className="text-sm text-muted-foreground">{t.role}</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" aria-label="Previous" onClick={() => setI((i - 1 + items.length) % items.length)} className="btn-ghost !p-2.5">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button type="button" aria-label="Next" onClick={() => setI((i + 1) % items.length)} className="btn-ghost !p-2.5">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-6 flex gap-1.5">
            {items.map((_, k) => (
              <span key={k} className={`h-1 rounded-full transition-all ${k === i ? "w-8 bg-primary" : "w-3 bg-muted"}`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
