import type { Metadata } from "next";

import { DailyReview } from "@/features/review/components/DailyReview";

export const metadata: Metadata = {
  description: "Estimate today's available attention.",
  title: "Daily Review | Atlas",
};

export default function DailyReviewPage() {
  return <DailyReview />;
}
