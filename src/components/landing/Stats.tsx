import { useEffect, useRef, useState } from "react";

const stats = [
  { label: "Registered explorers", value: 128_400, suffix: "+" },
  { label: "Prompts processed", value: 41_900_000, suffix: "" },
  { label: "Snippets executed", value: 9_300_000, suffix: "" },
  { label: "Color palettes", value: 100, suffix: "" },
];

function format(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(n >= 100_000 ? 0 : 1) + "K";
  return n.toString();
}

function Counter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const dur = 1800;
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        setN(Math.round(value * eased));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [value]);
  return (
    <span ref={ref} className="font-display text-4xl font-extrabold tabular-nums sm:text-5xl">
      {format(n)}
      {suffix}
    </span>
  );
}

export function Stats() {
  return (
    <section className="relative px-4 py-16">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s, i) => (
          <div key={s.label} className={`reveal reveal-delay-${i + 1} glass rounded-3xl p-6 text-center`}>
            <Counter value={s.value} suffix={s.suffix} />
            <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
