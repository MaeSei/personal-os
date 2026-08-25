import type { Metadata } from "next";

import { MorningWorkflow } from "@/features/morning/components/MorningWorkflow";

export const metadata: Metadata = {
  description: "Move calmly from capacity to an intentional day.",
  title: "Morning Planning | Atlas",
};

export default function MorningPlanningPage() {
  return <MorningWorkflow />;
}
