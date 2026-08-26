"use client";

import { Status, type Area, type InboxTaskInput, type Project } from "@/domain";
import { TaskEditor } from "@/features/tasks/components/TaskEditor";
import type { TaskEditorValue } from "@/features/tasks/components/types";
import type { InboxClassificationPreview } from "@/features/contracts/AssistantFeature";

type TaskTriageFormProps = {
  readonly areas: readonly Area[];
  readonly disabled: boolean;
  readonly initialTitle: string;
  readonly onBack: () => void;
  readonly onSubmit: (input: InboxTaskInput) => Promise<boolean>;
  readonly projects: readonly Project[];
  readonly suggestion?: InboxClassificationPreview | null;
};

function TaskTriageForm({
  areas,
  disabled,
  initialTitle,
  onBack,
  onSubmit,
  projects,
  suggestion,
}: TaskTriageFormProps) {
  const initialValue: TaskEditorValue = {
    areaId: suggestion?.areaId ?? "",
    context: suggestion?.contexts[0] ?? null,
    contexts: suggestion?.contexts ?? [],
    description: null,
    dueDate: null,
    durationMinutes: suggestion?.estimatedDurationMinutes ?? null,
    effort: 3,
    estimateConfidence: null,
    estimatedDuration: suggestion?.estimatedDurationMinutes ?? null,
    energyCost: (suggestion?.energy ?? 3) as 1 | 2 | 3 | 4 | 5,
    projectId: suggestion?.projectId ?? null,
    preferredContext: suggestion?.contexts[0] ?? null,
    preferredTime: null,
    scheduledDate: null,
    scheduledEnd: null,
    scheduledStart: null,
    status: Status.Today,
    title: initialTitle,
  };

  return (
    <TaskEditor
      areas={areas}
      disabled={disabled}
      idPrefix="inbox-task"
      initialValue={initialValue}
      onCancel={onBack}
      onSubmit={onSubmit}
      projects={projects}
      showStatus={false}
      submitLabel="Create Task"
    />
  );
}

export { TaskTriageForm };
