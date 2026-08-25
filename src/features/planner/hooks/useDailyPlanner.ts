"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { subscribeToInboxCaptured } from "@/features/capture/captureEvents";
import type {
  DailyPlannerData,
  PlannerFeature,
  TimeBlockUpdateInput,
  TimeBlockWriteInput,
} from "@/features/contracts/PlannerFeature";

function useDailyPlanner(planner: PlannerFeature) {
  const [announcement, setAnnouncement] = useState("");
  const [data, setData] = useState<DailyPlannerData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  const load = useCallback(async () => {
    setData(await planner.loadPlanner());
  }, [planner]);

  useEffect(() => {
    let isActive = true;
    planner
      .loadPlanner()
      .then((result) => {
        if (isActive) setData(result);
      })
      .catch(() => {
        if (isActive) setError("Atlas could not load today's plan.");
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [planner]);

  useEffect(
    () =>
      subscribeToInboxCaptured(() => {
        load().catch(() => setError("Atlas could not refresh the Planner."));
      }),
    [load],
  );

  async function run(
    action: () => Promise<DailyPlannerData>,
    message: string,
  ): Promise<boolean> {
    if (savingRef.current) return false;
    savingRef.current = true;
    setAnnouncement("");
    setError(null);
    setIsSaving(true);
    try {
      setData(await action());
      setAnnouncement(message);
      return true;
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Atlas could not save that planning change.",
      );
      return false;
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }

  return {
    announcement,
    createTimeBlock: (input: TimeBlockWriteInput) =>
      run(() => planner.createTimeBlock(input), "Time Block created."),
    data,
    deleteTimeBlock: (blockId: string) =>
      run(() => planner.deleteTimeBlock(blockId), "Time Block deleted."),
    duplicateTimeBlock: (blockId: string, start: number) =>
      run(
        () => planner.duplicateTimeBlock(blockId, start),
        "Time Block duplicated.",
      ),
    error,
    isLoading,
    isSaving,
    linkProject: (blockId: string, projectId: string) =>
      run(
        () => planner.linkProjectToTimeBlock(blockId, projectId),
        "Project linked to Time Block.",
      ),
    linkTask: (blockId: string, taskId: string) =>
      run(
        () => planner.linkTaskToTimeBlock(blockId, taskId),
        "Task linked to Time Block.",
      ),
    mergeTimeBlocks: (firstBlockId: string, secondBlockId: string) =>
      run(
        () => planner.mergeTimeBlocks(firstBlockId, secondBlockId),
        "Adjacent Time Blocks merged.",
      ),
    moveTask: (taskId: string, direction: "down" | "up") =>
      run(() => planner.moveTask(taskId, direction), "Plan order updated."),
    moveTimeBlock: (blockId: string, start: number) =>
      run(() => planner.moveTimeBlock(blockId, start), "Time Block moved."),
    placeTask: (taskId: string, beforeTaskId?: string | null) =>
      run(() => planner.placeTask(taskId, beforeTaskId), "Task added to today."),
    placeTasks: (taskIds: readonly string[]) =>
      run(
        () => planner.placeTasks(taskIds),
        `${taskIds.length} ${taskIds.length === 1 ? "Task" : "Tasks"} added to today.`,
      ),
    reload: async () => {
      setError(null);
      setIsLoading(true);
      try {
        await load();
        return true;
      } catch {
        setError("Atlas could not load today's plan.");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    removeTask: (taskId: string) =>
      run(() => planner.removeTask(taskId), "Task returned to the pool."),
    resizeTimeBlock: (blockId: string, end: number) =>
      run(() => planner.resizeTimeBlock(blockId, end), "Time Block resized."),
    saveDraft: () =>
      run(() => planner.saveDraft(), "Morning plan saved as a draft."),
    setTimeBlockLocked: (blockId: string, locked: boolean) =>
      run(
        () => planner.setTimeBlockLocked(blockId, locked),
        locked ? "Time Block locked." : "Time Block unlocked.",
      ),
    splitTimeBlock: (blockId: string, splitAt: number) =>
      run(() => planner.splitTimeBlock(blockId, splitAt), "Time Block split."),
    startDay: () =>
      run(() => planner.startDay(), "Your day has started."),
    unlinkProject: (blockId: string, projectId: string) =>
      run(
        () => planner.unlinkProjectFromTimeBlock(blockId, projectId),
        "Project unlinked from Time Block.",
      ),
    unlinkTask: (blockId: string, taskId: string) =>
      run(
        () => planner.unlinkTaskFromTimeBlock(blockId, taskId),
        "Task unlinked from Time Block.",
      ),
    unscheduleTask: (taskId: string) =>
      run(() => planner.unscheduleTask(taskId), "Task kept today without a time."),
    updateTimeBlock: (blockId: string, input: TimeBlockUpdateInput) =>
      run(() => planner.updateTimeBlock(blockId, input), "Time Block updated."),
  };
}

export { useDailyPlanner };
