"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  FocusFeature,
  FocusSessionData,
} from "@/features/contracts/FocusFeature";

type SessionCommand = () => Promise<FocusSessionData>;

/** Keeps transport and mutation state outside the Focus Session presentation. */
function useFocusSession(focus: FocusFeature) {
  const [data, setData] = useState<FocusSessionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await focus.loadFocusSession());
    } catch {
      setError("Atlas could not load this Focus Session.");
    }
  }, [focus]);

  useEffect(() => {
    let active = true;
    focus.loadFocusSession()
      .then((result) => {
        if (active) setData(result);
      })
      .catch(() => {
        if (active) setError("Atlas could not load this Focus Session.");
      });
    return () => {
      active = false;
    };
  }, [focus]);

  const run = useCallback(
    async (command: SessionCommand, successMessage: string) => {
      if (isPending) return;
      setError(null);
      setMessage("");
      setIsPending(true);
      try {
        setData(await command());
        setMessage(successMessage);
      } catch {
        setError("Atlas could not save that change. Please try again.");
      } finally {
        setIsPending(false);
      }
    },
    [isPending],
  );

  const complete = useCallback(async () => {
    const task = data?.plan.currentFocus;
    if (!task || isPending) return;
    setError(null);
    setMessage("");
    setIsPending(true);
    try {
      const completed = await focus.completeItem(task.id);
      if (!completed) throw new Error("The Task no longer exists.");
      setData(await focus.loadFocusSession());
      setMessage(`${completed.title} was completed.`);
    } catch {
      setError("Atlas could not complete this Task. Please try again.");
    } finally {
      setIsPending(false);
    }
  }, [data?.plan.currentFocus, focus, isPending]);

  return { complete, data, error, isPending, load, message, run };
}

export { useFocusSession };
