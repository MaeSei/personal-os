"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  TaskAssignmentInput,
  TaskDetailData,
  TaskFeature,
  TaskWriteInput,
} from "@/features/contracts/TaskFeature";

function useTaskDetail(taskId: string, tasks: TaskFeature) {
  const [announcement, setAnnouncement] = useState("");
  const [data, setData] = useState<TaskDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const reload = useCallback(async () => {
    const result = await tasks.loadTask(taskId);
    setData(result);
    setNotFound(result === null);
  }, [taskId, tasks]);

  useEffect(() => {
    let active = true;
    tasks
      .loadTask(taskId)
      .then((result) => {
        if (!active) return;
        setData(result);
        setNotFound(result === null);
      })
      .catch(() => {
        if (active) setError("Atlas could not load this Task.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [taskId, tasks]);

  async function run<Result>(
    action: () => Promise<Result>,
    message: string,
    shouldReload = true,
  ): Promise<Result | null> {
    setAnnouncement("");
    setError(null);
    setIsSaving(true);
    try {
      const result = await action();
      if (shouldReload) await reload();
      setAnnouncement(message);
      return result;
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Atlas could not save that change. Please try again.",
      );
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  return {
    announcement,
    convert: (outcome: string) =>
      run(
        () => tasks.convertToProject(taskId, outcome),
        "Task converted to a Project.",
        false,
      ),
    data,
    deleteTask: () =>
      run(() => tasks.deleteTask(taskId), "Task deleted.", false),
    detach: () =>
      run(() => tasks.detachFromProject(taskId), "Task detached from Project."),
    duplicate: () =>
      run(() => tasks.duplicateTask(taskId), "Task duplicated.", false),
    error,
    isLoading,
    isSaving,
    move: (input: TaskAssignmentInput) =>
      run(() => tasks.moveTask(taskId, input), "Task moved."),
    notFound,
    retry: () => {
      setError(null);
      setIsLoading(true);
      reload()
        .catch(() => setError("Atlas could not load this Task."))
        .finally(() => setIsLoading(false));
    },
    update: (input: TaskWriteInput) =>
      run(() => tasks.updateTask(taskId, input), "Task updated."),
  };
}

export { useTaskDetail };
