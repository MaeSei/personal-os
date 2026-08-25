"use client";

import { useRef, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Divider } from "@/components/ui/Divider";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import type {
  DailyPlannerData,
  TimeBlockWriteInput,
} from "@/features/contracts/PlannerFeature";
import type { TimeBlockActions } from "@/features/planner/components/TimeBlockActions";
import { AvailableSlots } from "@/features/planner/components/AvailableSlots";
import { CalendarEvents } from "@/features/planner/components/CalendarEvents";
import { TimeBlockForm } from "@/features/planner/components/TimeBlockForm";
import { TimeBlockList } from "@/features/planner/components/TimeBlockList";
import { TaskDropZone } from "@/features/planner/components/TaskDropZone";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type TimeBlocksSectionProps = Pick<
  DailyPlannerData,
  "availableSlots" | "calendar" | "commitments" | "projects" | "taskPool" | "timeBlocks"
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
  const scheduledIds = new Set(
    timeBlocks.flatMap((block) => block.linkedTasks.map((task) => task.id)),
  );
  const schedulableTasks = tasks.filter((task) => !scheduledIds.has(task.id));

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
        description="Turn a Task into planned work by placing it in genuinely open time. Scheduling never completes or changes the Task status."
        id="calendar-workspace"
        title="Day timeline"
      >
        <div className="grid items-start gap-card lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Card padding="sm" tone="subtle">
            <CalendarEvents calendar={props.calendar} />
          </Card>
          <AvailableSlots
            disabled={disabled}
            onSchedule={props.onScheduleTask}
            slots={props.availableSlots}
            tasks={schedulableTasks}
          />
        </div>
        <Divider />
        <div className={spacingStyles.detailStack}>
          <div className={spacingStyles.cluster}>
            <h3 className={typographyStyles.cardTitle}>Time Blocks</h3>
            <Badge variant="neutral">{timeBlocks.length}</Badge>
          </div>
          <TaskDropZone
            className="p-card"
            disabled={disabled}
            id="time-block-creator"
            label="Custom Time Block creation. Drop a Task to prepare its schedule."
            onDropTask={dropTask}
          >
            <p className={showForm ? "mb-detail text-sm text-ink-muted" : "text-sm text-ink-muted"}>
              Need a different time or block type? Build a custom reservation here.
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
        </div>
      </Section>
    </div>
  );
}

export { TimeBlocksSection };
