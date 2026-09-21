import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { FAMILIES, PALETTES, paletteColors } from "@/lib/themes";
import { useSound } from "@/hooks/use-sound";

export function ThemePicker() {
  const { palette, setPaletteId } = useTheme();
  const { click } = useSound();
  const [family, setFamily] = useState<string>("all");

  const shown = useMemo(
    () => (family === "all" ? PALETTES : PALETTES.filter((p) => p.family.id === family)),
    [family],
  );

  return (
    <section id="themes" className="relative px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="reveal mx-auto mb-10 max-w-2xl text-center">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">05 — Color engine</p>
          <h2 className="mt-3 text-3xl font-extrabold sm:text-5xl">100 moods. Zero toggles.</h2>
          <p className="mt-4 text-muted-foreground">
            Pick any swatch — buttons, borders, glows, glass and even the planet re-harmonise instantly.
            Currently wearing <span className="font-semibold text-foreground">{palette.name}</span>.
          </p>
        </div>

        <div className="reveal mb-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => setFamily("all")}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${family === "all" ? "bg-primary text-primary-foreground shadow-glow" : "glass text-muted-foreground hover:text-foreground"}`}
          >
            All 100
          </button>
          {FAMILIES.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFamily(f.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${family === f.id ? "bg-primary text-primary-foreground shadow-glow" : "glass text-muted-foreground hover:text-foreground"}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="reveal glass-strong rounded-3xl p-4 sm:p-6">
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10 sm:gap-3">
            {shown.map((p) => {
              const c = paletteColors(p);
              const active = p.id === palette.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  title={p.name}
                  aria-label={`Apply ${p.name} theme`}
                  aria-pressed={active}
                  onClick={() => { click(); setPaletteId(p.id); }}
                  className={`group relative aspect-square overflow-hidden rounded-2xl ring-1 transition-transform hover:scale-110 hover:z-10 ${active ? "ring-2 ring-primary shadow-glow scale-110 z-10" : "ring-glass-border"}`}
                  style={{ background: `linear-gradient(135deg, ${c.primary} 0%, ${c.accent} 55%, ${c.deep} 100%)` }}
                >
                  {active && (
                    <span className="absolute inset-0 flex items-center justify-center bg-space-deep/30">
                      <Check className="h-4 w-4 text-primary-foreground drop-shadow" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
