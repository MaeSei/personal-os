"use client";

import { Status, type Area, type InboxTaskInput, type Project } from "@/domain";
import { TaskEditor } from "@/features/tasks/components/TaskEditor";
import type { TaskEditorValue } from "@/features/tasks/components/types";

type TaskTriageFormProps = {
  readonly areas: readonly Area[];
  readonly disabled: boolean;
  readonly initialTitle: string;
  readonly onBack: () => void;
  readonly onSubmit: (input: InboxTaskInput) => Promise<boolean>;
  readonly projects: readonly Project[];
};

function TaskTriageForm({
  areas,
  disabled,
  initialTitle,
  onBack,
  onSubmit,
  projects,
}: TaskTriageFormProps) {
  const initialValue: TaskEditorValue = {
    areaId: "",
    context: null,
    description: null,
    dueDate: null,
    durationMinutes: null,
    estimatedDuration: null,
    energyCost: 3,
    projectId: null,
    preferredContext: null,
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
