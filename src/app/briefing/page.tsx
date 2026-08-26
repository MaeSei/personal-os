import type { Metadata } from "next";

import { ExecutiveBriefing } from "@/features/assistant/components/ExecutiveBriefing";

export const metadata: Metadata = {
  description: "An evidence-linked morning briefing from Atlas.",
  title: "Executive Briefing | Atlas",
};

export default function ExecutiveBriefingPage() {
  return <ExecutiveBriefing />;
}
