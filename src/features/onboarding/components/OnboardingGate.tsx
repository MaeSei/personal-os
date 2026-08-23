"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { PageStatus } from "@/components/ui/PageStatus";
import type { AreaRepository } from "@/repositories/AreaRepository";
import { LocalStorageRepository } from "@/repositories/LocalStorageRepository";

const areaRepository: AreaRepository = new LocalStorageRepository();
const onboardingPath = "/onboarding";

type OnboardingGateProps = {
  children: ReactNode;
};

/** Keeps all user-facing Atlas routes behind locally persisted Area setup. */
function OnboardingGate({ children }: OnboardingGateProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState(0);
  const [verifiedPath, setVerifiedPath] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    areaRepository
      .getAreas()
      .then((areas) => {
        if (!isActive) {
          return;
        }

        setError(null);

        if (areas.length === 0 && pathname !== onboardingPath) {
          router.replace(onboardingPath);
          return;
        }

        if (areas.length > 0 && pathname === onboardingPath) {
          router.replace("/");
          return;
        }

        setVerifiedPath(pathname);
      })
      .catch(() => {
        if (isActive) {
          setError("Atlas could not read this browser's Areas.");
        }
      });

    return () => {
      isActive = false;
    };
  }, [pathname, requestId, router]);

  if (error) {
    return (
      <PageStatus
        action={
          <Button
            onClick={() => {
              setVerifiedPath(null);
              setRequestId((current) => current + 1);
            }}
            variant="secondary"
          >
            Try again
          </Button>
        }
        description={error}
        title="Atlas setup is unavailable"
        tone="danger"
      />
    );
  }

  if (verifiedPath !== pathname) {
    return (
      <PageStatus
        description="Checking the Areas that shape your Atlas."
        title="Preparing Atlas"
      />
    );
  }

  return children;
}

export { OnboardingGate, type OnboardingGateProps };
