import type { Metadata } from "next";

import { ReflectionCoach } from "@/features/assistant/components/ReflectionCoach";

export const metadata: Metadata = {
  description: "Evidence-based reflection on Atlas history.",
  title: "Reflection Coach | Atlas",
};

export default function ReflectionCoachPage() {
  return <ReflectionCoach />;
}
