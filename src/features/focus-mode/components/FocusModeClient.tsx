"use client";

import { Button } from "@/components/ui/Button";
import { PageStatus } from "@/components/ui/PageStatus";
import { FocusMode } from "@/features/focus-mode/components/FocusMode";
import { useFocusSession } from "@/features/focus-mode/hooks/useFocusSession";
import { useFeatures } from "@/features/FeatureProvider";

/** Connects the Focus Session UI to its application feature boundary. */
function FocusModeClient() {
  const { focus } = useFeatures();
  const state = useFocusSession(focus);
  const taskId = state.data?.plan.currentFocus?.id;

  if (!state.data && state.error) {
    return (
      <PageStatus
        action={<Button onClick={() => void state.load()} variant="secondary">Try again</Button>}
        description={state.error}
        title="Focus Session is unavailable"
        tone="danger"
      />
    );
  }

  if (!state.data) {
    return (
      <PageStatus
        description="Gathering the task and its working context."
        title="Preparing Focus Session"
      />
    );
  }

  const runForCurrent = (
    command: (id: string) => ReturnType<typeof focus.loadFocusSession>,
    message: string,
  ) => taskId ? state.run(() => command(taskId), message) : Promise.resolve();

  return (
    <FocusMode
      data={state.data}
      disabled={state.isPending}
      error={state.error}
      message={state.message}
      onAddChecklistItem={(title) => runForCurrent(
        (id) => focus.addChecklistItem(id, title),
        "Checklist step added.",
      )}
      onComplete={() => void state.complete()}
      onPause={() => void runForCurrent(
        (id) => focus.pauseSession(id),
        "Focus timer paused.",
      )}
      onRemoveChecklistItem={(itemId) => runForCurrent(
        (id) => focus.removeChecklistItem(id, itemId),
        "Checklist step removed.",
      )}
      onResume={() => void runForCurrent(
        (id) => focus.resumeSession(id),
        "Focus timer running.",
      )}
      onSaveNotes={(notes) => runForCurrent(
        (id) => focus.updateNotes(id, notes),
        "Session notes saved.",
      )}
      onSwitch={(nextTaskId) => state.run(
        () => focus.switchTask(nextTaskId),
        "Current task switched. Start the timer when you are ready.",
      )}
      onToggleChecklistItem={(itemId, completed) => runForCurrent(
        (id) => focus.setChecklistItemCompleted(id, itemId, completed),
        completed ? "Checklist step completed." : "Checklist step reopened.",
      )}
    />
  );
}

export { FocusModeClient };
