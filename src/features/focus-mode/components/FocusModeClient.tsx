"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { PageStatus } from "@/components/ui/PageStatus";
import type { FocusModePlan } from "@/domain";
import { FocusMode } from "@/features/focus-mode/components/FocusMode";
import { loadFocusMode } from "@/features/focus-mode/loadFocusMode";
import { useFeatures } from "@/features/FeatureProvider";

/** Loads server-persisted focus data through the feature boundary. */
function FocusModeClient() {
  const { focus } = useFeatures();
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [completionMessage, setCompletionMessage] = useState("");
  const [plan, setPlan] = useState<FocusModePlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [requestId, setRequestId] = useState(0);

  useEffect(() => {
    let isActive = true;

    loadFocusMode({ focus })
      .then((focusPlan) => {
        if (isActive) {
          setPlan(focusPlan);
        }
      })
      .catch(() => {
        if (isActive) {
          setError("Atlas could not load Focus Mode.");
        }
      });

    return () => {
      isActive = false;
    };
  }, [focus, requestId]);

  async function handleCompleteCurrent() {
    if (!plan?.currentFocus || isCompleting) {
      return;
    }

    const item = plan.currentFocus;
    setCompletionError(null);
    setCompletionMessage("");
    setIsCompleting(true);

    try {
      const completedItem = await focus.completeItem(item.id);

      if (!completedItem) {
        throw new Error("The focus Item no longer exists.");
      }

      setPlan(
        await loadFocusMode({ focus }),
      );
      setCompletionMessage(`${completedItem.title} was completed. Focus updated.`);
    } catch {
      setCompletionError("Atlas could not complete this Item. Please try again.");
    } finally {
      setIsCompleting(false);
    }
  }

  if (error) {
    return (
      <PageStatus
        action={
          <Button
            onClick={() => {
              setPlan(null);
              setError(null);
              setRequestId((current) => current + 1);
            }}
            variant="secondary"
          >
            Try again
          </Button>
        }
        description={error}
        title="Focus Mode is unavailable"
        tone="danger"
      />
    );
  }

  if (!plan) {
    return (
      <PageStatus
        description="Reducing today's plan to what matters now and next."
        title="Preparing Focus Mode"
      />
    );
  }

  return (
    <FocusMode
      completionError={completionError}
      completionMessage={completionMessage}
      isCompleting={isCompleting}
      onCompleteCurrent={() => void handleCompleteCurrent()}
      plan={plan}
    />
  );
}

export { FocusModeClient };
