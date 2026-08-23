import type { Metadata } from "next";

import { Onboarding } from "@/features/onboarding/components/Onboarding";

export const metadata: Metadata = {
  description: "Choose the Areas that will shape your Atlas.",
  title: "Welcome | Atlas",
};

export default function OnboardingPage() {
  return <Onboarding />;
}
