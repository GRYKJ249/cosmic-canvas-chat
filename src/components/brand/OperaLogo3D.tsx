import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { OperaLogoMark } from "./OperaLogoMark";

const OperaLogoScene = lazy(() => import("./OperaLogoScene"));

export function OperaLogo3D() {
  return (
    <div className="opera-logo-stage" aria-label="Opera AI dimensional company mark" role="img">
      <ClientOnly fallback={<OperaLogoMark className="h-48 w-48 sm:h-64 sm:w-64" />}>
        <Suspense fallback={<OperaLogoMark className="h-48 w-48 sm:h-64 sm:w-64" />}>
          <OperaLogoScene />
        </Suspense>
      </ClientOnly>
    </div>
  );
}