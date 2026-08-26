"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  ProjectDetailData,
  ProjectFeature,
  TaskWriteInput,
} from "@/features/contracts/ProjectFeature";
import type { BreakdownFeature } from "@/features/contracts/BreakdownFeature";

function useProjectDetail(
  projectId: string,
  projects: ProjectFeature,
  breakdown: BreakdownFeature,
) {
  const [announcement, setAnnouncement] = useState("");
  const [data, setData] = useState<ProjectDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const reload = useCallback(async () => {
    const result = await projects.loadProject(projectId);
    setData(result);
    setNotFound(result === null);
  }, [projectId, projects]);

  useEffect(() => {
    let isActive = true;
    projects
      .loadProject(projectId)
      .then((result) => {
        if (!isActive) return;
        setData(result);
        setNotFound(result === null);
      })
      .catch(() => {
        if (isActive) setError("Atlas could not load this Project.");
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [projectId, projects]);

  async function run(
    action: () => Promise<unknown>,
    message: string,
  ): Promise<boolean> {
    setAnnouncement("");
    setError(null);
    setIsSaving(true);
    try {
      await action();
      await reload();
      setAnnouncement(message);
      return true;
    } catch {
      setError("Atlas could not save that change. Please try again.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  return {
    announcement,
    breakDown: (titles: readonly string[]) => {
      if (!data) return Promise.resolve(false);
      return run(
        () =>
          breakdown.breakDown({
            projectId,
            tasks: titles.map((title) => ({
              areaId: data.detail.project.areaId,
              projectId,
              title,
            })),
          }),
        `${titles.length} ${titles.length === 1 ? "Task" : "Tasks"} added.`,
      );
    },
    createTask: (input: TaskWriteInput) =>
      run(() => projects.createTask(input), "Task created."),
    createMilestone: (input: Parameters<ProjectFeature["createMilestone"]>[1]) =>
      run(() => projects.createMilestone(projectId, input), "Milestone created."),
    createNote: (body: string, pinned: boolean) =>
      run(() => projects.createNote(projectId, body, pinned), "Note added."),
    data,
    deleteMilestone: (milestoneId: string) =>
      run(
        () => projects.deleteMilestone(projectId, milestoneId),
        "Milestone removed. Its Tasks remain in the Project.",
      ),
    deleteNote: (noteId: string) =>
      run(() => projects.deleteNote(projectId, noteId), "Note deleted."),
    deleteTask: (taskId: string) =>
      run(() => projects.deleteTask(taskId), "Task deleted."),
    error,
    isLoading,
    isSaving,
    notFound,
    reload,
    groupTask: (taskId: string, milestoneId: string | null) =>
      run(
        () => projects.groupTask(projectId, taskId, milestoneId),
        "Task group updated.",
      ),
    linkRelatedProject: (relatedProjectId: string) =>
      run(
        () => projects.linkRelatedProject(projectId, relatedProjectId),
        "Related Project added.",
      ),
    reorderTask: (taskId: string, direction: "down" | "up") =>
      run(
        () => projects.reorderTask(projectId, taskId, direction),
        "Task order updated.",
      ),
    retry: () => {
      setError(null);
      setIsLoading(true);
      reload()
        .catch(() => setError("Atlas could not load this Project."))
        .finally(() => setIsLoading(false));
    },
    setMilestoneCompleted: (milestoneId: string, completed: boolean) =>
      run(
        () => projects.setMilestoneCompleted(projectId, milestoneId, completed),
        completed ? "Milestone achieved." : "Milestone reopened.",
      ),
    setNotePinned: (noteId: string, pinned: boolean) =>
      run(
        () => projects.setNotePinned(projectId, noteId, pinned),
        pinned ? "Note pinned." : "Note unpinned.",
      ),
    unlinkRelatedProject: (relatedProjectId: string) =>
      run(
        () => projects.unlinkRelatedProject(projectId, relatedProjectId),
        "Related Project removed.",
      ),
    updateTask: (taskId: string, input: TaskWriteInput) =>
      run(() => projects.updateTask(taskId, input), "Task updated."),
  };
}

export { useProjectDetail };
