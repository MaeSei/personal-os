"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  WorkspaceData,
  WorkspaceFeature,
} from "@/features/contracts/WorkspaceFeature";
import type { WorkspaceTaskFilters } from "@/domain";

/** Owns only transport state; Workspace decisions stay in the application layer. */
function useWorkspace(workspace: WorkspaceFeature) {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [filters, setFilters] = useState<WorkspaceTaskFilters>({});

  const reload = useCallback(async () => {
    setError(null);
    if (!data) setIsLoading(true);
    try {
      setData(await workspace.loadWorkspace(filters));
    } catch {
      setError("Atlas could not load your Workspace.");
    } finally {
      setIsLoading(false);
    }
  }, [data, filters, workspace]);

  const applyFilters = useCallback(async (next: WorkspaceTaskFilters) => {
    setError(null);
    setIsFiltering(true);
    try {
      setData(await workspace.loadWorkspace(next));
      setFilters(next);
    } catch {
      setError("Atlas could not filter your Workspace.");
    } finally {
      setIsFiltering(false);
    }
  }, [workspace]);

  const mutate = useCallback(async (
    taskId: string,
    command: () => Promise<void>,
    successMessage: string,
  ) => {
    setAnnouncement("");
    setError(null);
    setPendingTaskId(taskId);
    try {
      await command();
      setData(await workspace.loadWorkspace(filters));
      setAnnouncement(successMessage);
      return true;
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Atlas could not update today's Workspace.",
      );
      return false;
    } finally {
      setPendingTaskId(null);
    }
  }, [filters, workspace]);

  useEffect(() => {
    let isActive = true;

    workspace
      .loadWorkspace()
      .then((workspaceData) => {
        if (isActive) setData(workspaceData);
      })
      .catch(() => {
        if (isActive) setError("Atlas could not load your Workspace.");
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [workspace]);

  return {
    announcement,
    applyFilters,
    archiveTask: (taskId: string) => mutate(
      taskId,
      () => workspace.archiveTask(taskId),
      "Task archived.",
    ),
    data,
    error,
    filters,
    focusTask: (taskId: string) => mutate(
      taskId,
      () => workspace.focusTask(taskId),
      "Focus selected.",
    ),
    isFiltering,
    isLoading,
    pendingTaskId,
    placeTask: (
      taskId: string,
      beforeTaskId?: string | null,
      group?: string | null,
      pinned?: boolean,
    ) => mutate(
      taskId,
      () => workspace.placeTask({ beforeTaskId, group, pinned, taskId }),
      "Today's Workspace updated.",
    ),
    reload,
    removeTask: (taskId: string) => mutate(
      taskId,
      () => workspace.removeTask(taskId),
      "Task returned to the available pool.",
    ),
    setTaskGroup: (taskId: string, group: string | null) => mutate(
      taskId,
      () => workspace.setTaskGroup(taskId, group),
      group ? `Task moved to ${group}.` : "Task moved to Ungrouped.",
    ),
    setTaskPinned: (taskId: string, pinned: boolean) => mutate(
      taskId,
      () => workspace.setTaskPinned(taskId, pinned),
      pinned ? "Task pinned." : "Task unpinned.",
    ),
  };
}

export { useWorkspace };
