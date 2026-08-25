"use client";

import type { ReactNode } from "react";

import { FeatureProvider } from "@/features/FeatureProvider";
import { httpFeatures } from "@/features/http/HttpFeatures";

type ApplicationContainerProviderProps = {
  readonly children: ReactNode;
};

/** Supplies HTTP feature proxies without exposing server services to the UI. */
function ApplicationContainerProvider({
  children,
}: ApplicationContainerProviderProps) {
  return (
    <FeatureProvider features={httpFeatures}>
      {children}
    </FeatureProvider>
  );
}

export { ApplicationContainerProvider };
export type { ApplicationContainerProviderProps };
