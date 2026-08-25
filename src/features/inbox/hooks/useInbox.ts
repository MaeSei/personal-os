"use client";

import { useCallback, useEffect, useState } from "react";

import type { Project } from "@/domain";
import { subscribeToInboxCaptured } from "@/features/capture/captureEvents";
import type {
  InboxFeature,
  InboxProcessingData,
  ProcessProjectInput,
  ProcessTaskInput,
} from "@/features/contracts/InboxFeature";

const emptyData: InboxProcessingData = {
  areas: [],
  items: [],
  projects: [],
};

/** Coordinates transient Inbox UI state through the Inbox feature contract. */
type UseInboxOptions = {
  readonly onProcessed?: () => void;
};

function useInbox(inbox: InboxFeature, options: UseInboxOptions = {}) {
  const [announcement, setAnnouncement] = useState("");
  const [data, setData] = useState<InboxProcessingData>(emptyData);
  const [error, setError] = useState<string | null>(null);
  const [focusVersion, setFocusVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [projectFollowUp, setProjectFollowUp] = useState<Project | null>(null);

  const reload = useCallback(async () => {
    setData(await inbox.getProcessingData());
  }, [inbox]);

  useEffect(() => {
    let isActive = true;

    inbox
      .getProcessingData()
      .then((storedData) => {
        if (isActive) setData(storedData);
      })
      .catch(() => {
        if (isActive) {
          setError("Atlas could not read your Inbox.");
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [inbox]);

  useEffect(
    () =>
      subscribeToInboxCaptured(() => {
        setError(null);
        reload().catch(() => {
          setError("Atlas could not refresh your Inbox.");
        });
      }),
    [reload],
  );

  async function run(
    action: () => Promise<unknown>,
    successMessage: string,
  ): Promise<boolean> {
    setAnnouncement("");
    setError(null);
    setIsProcessing(true);

    try {
      await action();
      await reload();
      options.onProcessed?.();
      setAnnouncement(successMessage);
      setFocusVersion((current) => current + 1);
      return true;
    } catch {
      setError("Atlas could not process that Item. Please try again.");
      return false;
    } finally {
      setIsProcessing(false);
    }
  }

  async function processTask(input: ProcessTaskInput): Promise<boolean> {
    return run(
      () => inbox.processAsTask(input),
      "Task created. Your Inbox is one Item lighter.",
    );
  }

  async function processProject(input: ProcessProjectInput): Promise<boolean> {
    setAnnouncement("");
    setError(null);
    setIsProcessing(true);

    try {
      const project = await inbox.processAsProject(input);
      await reload();
      options.onProcessed?.();
      setProjectFollowUp(project);
      setAnnouncement("Project created. Decide whether it needs a first Task.");
      setFocusVersion((current) => current + 1);
      return true;
    } catch {
      setError("Atlas could not create that Project. Please try again.");
      return false;
    } finally {
      setIsProcessing(false);
    }
  }

  async function addFirstTask(title: string): Promise<boolean> {
    if (!projectFollowUp) return false;

    const didSave = await run(
      () => inbox.addFirstTask(projectFollowUp.id, title),
      "First Task added. It is ready for focus planning.",
    );
    if (didSave) setProjectFollowUp(null);
    return didSave;
  }

  return {
    ...data,
    addFirstTask,
    announcement,
    clearError: () => setError(null),
    deleteItem: (itemId: string) =>
      run(
        () => inbox.deleteInboxItem(itemId),
        "Inbox Item deleted.",
      ),
    error,
    focusVersion,
    finishProject: () => {
      setError(null);
      setProjectFollowUp(null);
      setFocusVersion((current) => current + 1);
    },
    isLoading,
    isProcessing,
    processProject,
    processReference: (itemId: string) =>
      run(
        () => inbox.processAsReference(itemId),
        "Saved as Reference.",
      ),
    processSomeday: (itemId: string) =>
      run(() => inbox.processAsSomeday(itemId), "Moved to Someday."),
    processTask,
    projectFollowUp,
  };
}

export { useInbox };
