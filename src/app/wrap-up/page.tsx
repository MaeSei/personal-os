import type { Metadata } from "next";

import { DailyWrapUp } from "@/features/wrap-up/components/DailyWrapUp";

export const metadata: Metadata = {
  description: "Close the day with a calm, evidence-based reflection.",
  title: "Daily Wrap-Up | Atlas",
};

export default function DailyWrapUpPage() {
  return <DailyWrapUp />;
}
