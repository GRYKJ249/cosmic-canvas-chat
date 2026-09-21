import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Contrast, ImageIcon, LayoutDashboard, Palette, Volume2, VolumeX, Code2 } from "lucide-react";
import { OperaLogoMark } from "@/components/brand/OperaLogoMark";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useSound } from "@/hooks/use-sound";
import { useLang } from "@/lib/i18n";

const links = [
  { href: "#platform", label: "Platform" },
  { href: "#workspace", label: "Workspace" },
  { href: "#security", label: "Security" },
  { href: "#studio", label: "Studio" },
  { href: "#themes", label: "Themes" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const { highContrast, setHighContrast } = useTheme();
  const { enabled, setEnabled, click } = useSound();
  const { lang, setLang, t } = useLang();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4">
      <nav
        className={`mx-auto flex max-w-6xl items-center justify-between rounded-full px-4 py-2.5 transition-all duration-500 ${
          scrolled ? "glass-strong" : "border border-transparent"
        }`}
      >
        <a href="#top" className="flex items-center gap-3" onClick={click}>
          <OperaLogoMark className="h-9 w-9" />
          <span className="font-display text-lg font-800 font-bold tracking-tight">
            Opera<span className="text-primary">AI</span>
          </span>
        </a>

        <ul className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                onClick={click}
                className="rounded-full px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label={enabled ? "Disable sound cues" : "Enable sound cues"}
            aria-pressed={enabled}
            onClick={() => { setEnabled(!enabled); }}
            className="hidden rounded-full p-2 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground sm:inline-flex"
          >
            {enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <button
            type="button"
            aria-label="Toggle high-contrast mode"
            aria-pressed={highContrast}
            onClick={() => { click(); setHighContrast(!highContrast); }}
            className={`hidden rounded-full p-2 transition-colors hover:bg-primary/10 sm:inline-flex ${highContrast ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Contrast className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Toggle language"
            onClick={() => { click(); setLang(lang === "ar" ? "en" : "ar"); }}
            className="rounded-full px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
          >
            {lang === "ar" ? "EN" : "ع"}
          </button>
          <a href="#themes" onClick={click} className="btn-ghost hidden !px-3 !py-2 text-xs md:!inline-flex md:!px-4">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">100 Themes</span>
          </a>
          <Link to="/code" onClick={click} className="btn-ghost hidden !px-3 !py-2 text-xs sm:!inline-flex md:!px-4">
            <Code2 className="h-4 w-4" />
            <span className="hidden lg:inline">{t("Code", "الأكواد")}</span>
          </Link>
          <Link to="/studio" onClick={click} className="btn-ghost hidden !px-3 !py-2 text-xs sm:!inline-flex md:!px-4">
            <ImageIcon className="h-4 w-4" />
            <span className="hidden lg:inline">{t("Studio", "الاستوديو")}</span>
          </Link>
          <Link to="/chat" onClick={click} className="btn-hero !px-3 !py-2 text-xs md:!px-4">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Start</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
