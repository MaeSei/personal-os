"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { DayPlanStatus } from "@/domain";
import { useFeatures } from "@/features/FeatureProvider";
import type { MorningStage } from "@/features/morning/types";
import { useDailyPlanner } from "@/features/planner/hooks/useDailyPlanner";
import { useDailyReview } from "@/features/review/hooks/useDailyReview";

function getInitialStage(
  data: ReturnType<typeof useDailyPlanner>["data"],
): MorningStage | null {
  if (!data) return null;
  if (data.plan.status === DayPlanStatus.Started) return "started";
  if (data.plan.persisted) return "adjustments";
  return data.attention ? "attention" : "review";
}

function useMorningWorkflow() {
  const router = useRouter();
  const { planner, review } = useFeatures();
  const planning = useDailyPlanner(planner);
  const checkIn = useDailyReview(review);
  const [selectedStage, setStage] = useState<MorningStage | null>(null);
  const stage = selectedStage ?? getInitialStage(planning.data);

  async function completeReview() {
    const result = await checkIn.submit();
    if (!result) return;
    await planning.reload();
    setStage("attention");
  }

  async function saveAndLeave() {
    if (await planning.saveDraft()) router.push("/");
  }

  async function startDay() {
    if (await planning.startDay()) setStage("started");
  }

  return {
    checkIn,
    planning,
    saveAndLeave,
    setStage,
    skipForNow: () => router.push("/"),
    stage,
    startDay,
    completeReview,
  };
}

export { useMorningWorkflow };
