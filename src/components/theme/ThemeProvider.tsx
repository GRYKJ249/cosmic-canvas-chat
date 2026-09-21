import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_PALETTE_ID, getPalette, paletteVars, type Palette } from "@/lib/themes";

const STORAGE_KEY = "opera-theme";
const A11Y_KEY = "opera-a11y";

type Ctx = {
  palette: Palette;
  setPaletteId: (id: string) => void;
  highContrast: boolean;
  setHighContrast: (v: boolean) => void;
  hydrated: boolean;
};

const ThemeContext = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [paletteId, setId] = useState(DEFAULT_PALETTE_ID);
  const [highContrast, setHC] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setId(saved);
    setHC(localStorage.getItem(A11Y_KEY) === "1");
    setHydrated(true);
  }, []);

  const palette = useMemo(() => getPalette(paletteId), [paletteId]);

  useEffect(() => {
    const root = document.documentElement;
    const vars = paletteVars(palette);
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
    root.classList.toggle("dark", palette.family.dark);
    root.classList.toggle("light-scheme", !palette.family.dark);
    root.style.colorScheme = palette.family.dark ? "dark" : "light";
  }, [palette]);

  useEffect(() => {
    document.documentElement.classList.toggle("a11y", highContrast);
  }, [highContrast]);

  const setPaletteId = useCallback((id: string) => {
    setId(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);
  const setHighContrast = useCallback((v: boolean) => {
    setHC(v);
    localStorage.setItem(A11Y_KEY, v ? "1" : "0");
  }, []);

  return (
    <ThemeContext.Provider value={{ palette, setPaletteId, highContrast, setHighContrast, hydrated }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme outside ThemeProvider");
  return ctx;
}
