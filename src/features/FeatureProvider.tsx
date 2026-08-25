"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { AtlasFeatures } from "@/features/contracts/AtlasFeatures";

type FeatureProviderProps = {
  readonly children: ReactNode;
  readonly features: AtlasFeatures;
};

const FeatureContext = createContext<AtlasFeatures | null>(null);

/** Supplies feature interfaces without revealing their concrete services. */
function FeatureProvider({ children, features }: FeatureProviderProps) {
  return <FeatureContext value={features}>{children}</FeatureContext>;
}

function useFeatures(): AtlasFeatures {
  const features = useContext(FeatureContext);

  if (!features) {
    throw new Error("Atlas features must be used inside FeatureProvider.");
  }

  return features;
}

export { FeatureProvider, useFeatures };
export type { FeatureProviderProps };
