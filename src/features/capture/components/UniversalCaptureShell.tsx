"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { UniversalCapture } from "@/features/capture/components/UniversalCapture";
import { cn } from "@/lib/cn";
import { spacingStyles } from "@/theme/spacing";

const routesWithoutCapture = ["/design-system", "/onboarding"];

type UniversalCaptureShellProps = {
  readonly children: ReactNode;
};

/** Adds capture once at the shell while leaving setup and showcase routes clean. */
function UniversalCaptureShell({ children }: UniversalCaptureShellProps) {
  const pathname = usePathname();
  const isAvailable = !routesWithoutCapture.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  return (
    <>
      <div
        className={cn(
          "flex-1",
          isAvailable && spacingStyles.pageWithUniversalCapture,
        )}
      >
        {children}
      </div>
      {isAvailable ? <UniversalCapture /> : null}
    </>
  );
}

export { UniversalCaptureShell, type UniversalCaptureShellProps };
