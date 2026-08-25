"use client";

import { useEffect, useState } from "react";

import {
  EstimateAssessment,
  PlanAssessment,
} from "@/domain";
import type {
  DailyWrapUpData,
  WrapUpFeature,
} from "@/features/contracts/WrapUpFeature";

function useDailyWrapUp(feature: WrapUpFeature) {
  const [data, setData] = useState<DailyWrapUpData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notes, setNotes] = useState("");
  const [planAssessment, setPlanAssessment] = useState<PlanAssessment | null>(null);
  const [estimateAssessment, setEstimateAssessment] =
    useState<EstimateAssessment | null>(null);
  const [carryForwardTaskIds, setCarryForwardTaskIds] = useState<readonly string[]>([]);

  async function load() {
    setError(null);
    setIsLoading(true);
    try {
      setData(await feature.loadWrapUp());
    } catch {
      setError("Atlas could not assemble today's wrap-up evidence.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    feature
      .loadWrapUp()
      .then((result) => {
        if (active) setData(result);
      })
      .catch(() => {
        if (active) setError("Atlas could not assemble today's wrap-up evidence.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [feature]);

  function setCarryForward(taskId: string, selected: boolean) {
    setCarryForwardTaskIds((current) =>
      selected
        ? [...new Set([...current, taskId])]
        : current.filter((id) => id !== taskId),
    );
  }

  async function complete(): Promise<boolean> {
    if (!planAssessment || !estimateAssessment || isSaving) return false;
    setError(null);
    setIsSaving(true);
    try {
      setData(await feature.completeWrapUp({
        carryForwardTaskIds,
        estimateAssessment,
        notes,
        planAssessment,
      }));
      return true;
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Atlas could not save the Daily Wrap-Up.",
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  return {
    canSubmit: planAssessment !== null && estimateAssessment !== null,
    carryForwardTaskIds,
    complete,
    data,
    error,
    estimateAssessment,
    isLoading,
    isSaving,
    load,
    notes,
    planAssessment,
    setCarryForward,
    setEstimateAssessment,
    setNotes,
    setPlanAssessment,
  };
}

export { useDailyWrapUp };
