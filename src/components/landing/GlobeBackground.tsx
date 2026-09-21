import { lazy, Suspense, useEffect, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { useIsMobile } from "@/hooks/use-mobile";

const GlobeScene = lazy(() => import("./GlobeScene"));

/** Fixed full-screen WebGL layer. Lightweight settings on mobile. */
export function GlobeBackground() {
  const isMobile = useIsMobile();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="fx-layer pointer-events-none fixed inset-0 z-0" aria-hidden>
      <div className="absolute inset-0 bg-aurora" />
      <ClientOnly fallback={null}>
        {ready && (
          <Suspense fallback={null}>
            <div className="absolute inset-0 pointer-events-auto">
              <GlobeScene lite={isMobile} />
            </div>
          </Suspense>
        )}
      </ClientOnly>
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-b from-transparent to-background" />
    </div>
  );
}
