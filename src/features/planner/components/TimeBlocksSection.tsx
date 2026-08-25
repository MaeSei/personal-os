"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import type {
  DailyPlannerData,
  TimeBlockWriteInput,
} from "@/features/contracts/PlannerFeature";
import type { TimeBlockActions } from "@/features/planner/components/TimeBlockActions";
import { TimeBlockForm } from "@/features/planner/components/TimeBlockForm";
import { TimeBlockList } from "@/features/planner/components/TimeBlockList";
import { TaskDropZone } from "@/features/planner/components/TaskDropZone";
import { colorStyles } from "@/theme/colors";

type TimeBlocksSectionProps = Pick<
  DailyPlannerData,
  "commitments" | "projects" | "taskPool" | "timeBlocks"
> & TimeBlockActions & {
  readonly disabled: boolean;
  readonly initialTaskId?: string | null;
};

function TimeBlocksSection(props: TimeBlocksSectionProps) {
  const { commitments, disabled, projects, taskPool, timeBlocks } = props;
  const [selectedTaskId, setSelectedTaskId] = useState(
    props.initialTaskId ?? "",
  );
  const [showForm, setShowForm] = useState(Boolean(props.initialTaskId));
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const sectionFocusRef = useRef<HTMLDivElement>(null);
  const tasks = [...new Map(
    [...commitments, ...taskPool].map((task) => [task.id, task]),
  ).values()];

  function dropTask(taskId: string) {
    if (tasks.some(({ id }) => id === taskId)) {
      setSelectedTaskId(taskId);
      setShowForm(true);
    }
  }

  async function create(input: TimeBlockWriteInput) {
    const saved = await props.onCreate(input);
    if (saved) {
      setSelectedTaskId("");
      setShowForm(false);
      requestAnimationFrame(() => createButtonRef.current?.focus());
    }
    return saved;
  }

  return (
    <div className={colorStyles.focusRing} ref={sectionFocusRef} tabIndex={-1}>
    <Section
      action={(
        <Button
          aria-controls="time-block-creator"
          aria-expanded={showForm}
          onClick={() => setShowForm((current) => !current)}
          ref={createButtonRef}
          size="sm"
          variant="secondary"
        >
          {showForm ? "Close form" : "Create Time Block"}
        </Button>
      )}
      description="Reserve attention independently from Calendar. Locks protect timing; links provide work context."
      id="time-blocks"
      title="Time Blocks"
    >
      <TaskDropZone
        className="p-card"
        disabled={disabled}
        id="time-block-creator"
        label="Time Block creation. Drop a Task to prepare its schedule."
        onDropTask={dropTask}
      >
        <p className={showForm ? "mb-detail text-sm text-ink-muted" : "text-sm text-ink-muted"}>
          Drag a Task here to prepare its schedule, then choose and confirm the reservation.
        </p>
        {showForm ? (
          <TimeBlockForm
            disabled={disabled}
            initialTaskId={selectedTaskId}
            key={selectedTaskId || "unassigned"}
            onSubmit={create}
            projects={projects}
            tasks={tasks}
          />
        ) : null}
      </TaskDropZone>
      {timeBlocks.length === 0 ? (
        <EmptyState description="Create a Focus, Meeting, Break, Travel, Admin, Personal, or Flexible reservation." title="No Time Blocks yet" />
      ) : (
        <TimeBlockList
          {...props}
          focusRef={sectionFocusRef}
          tasks={tasks}
        />
      )}
    </Section>
    </div>
  );
}

export { TimeBlocksSection };
