"use client";

import { useId, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type {
  PlannerProject,
  PlannerTask,
  PlannerTimeBlock,
  TimeBlockUpdateInput,
} from "@/features/contracts/PlannerFeature";
import { TimeBlockLinks } from "@/features/planner/components/TimeBlockLinks";
import { TimeBlockDeleteAction } from "@/features/planner/components/TimeBlockDeleteAction";
import { TimeBlockDetailsForm } from "@/features/planner/components/TimeBlockDetailsForm";
import { TimeBlockTimingControls } from "@/features/planner/components/TimeBlockTimingControls";
import { formatClockTime, formatDuration } from "@/features/planner/presentation";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type TimeBlockCardProps = {
  readonly block: PlannerTimeBlock;
  readonly disabled: boolean;
  readonly mergeWithNextId?: string;
  readonly onDelete: () => Promise<boolean>;
  readonly onDuplicate: (start: number) => void;
  readonly onLinkProject: (id: string) => void;
  readonly onLinkTask: (id: string) => void;
  readonly onLock: (locked: boolean) => void;
  readonly onMerge: (nextId: string) => Promise<boolean>;
  readonly onMove: (start: number) => void;
  readonly onResize: (end: number) => void;
  readonly onSplit: (splitAt: number) => void;
  readonly onUnlinkProject: (id: string) => Promise<boolean>;
  readonly onUnlinkTask: (id: string) => Promise<boolean>;
  readonly onUpdate: (input: TimeBlockUpdateInput) => void;
  readonly projects: readonly PlannerProject[];
  readonly tasks: readonly PlannerTask[];
};

function TimeBlockCard(props: TimeBlockCardProps) {
  const { block, disabled } = props;
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const protectedAction = disabled || block.locked;

  async function mergeWithNext() {
    if (!props.mergeWithNextId) return;
    if (await props.onMerge(props.mergeWithNextId)) {
      requestAnimationFrame(() => toggleRef.current?.focus());
    }
  }

  return (
    <Card as="article" padding="sm">
      <div className={spacingStyles.cardStack}>
        <div className="flex items-start justify-between gap-cluster">
          <div className={spacingStyles.detailStack}>
            <div className={spacingStyles.cluster}>
              <Badge>{formatClockTime(block.start)}–{formatClockTime(block.end)}</Badge>
              <Badge variant="neutral">{formatDuration(block.end - block.start)}</Badge>
              <Badge variant={block.locked ? "attention" : "default"}>{block.locked ? "Locked" : block.type}</Badge>
            </div>
            <h3 className={typographyStyles.cardTitle}>{block.title}</h3>
            <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
              {block.linkedTasks.length} {block.linkedTasks.length === 1 ? "Task" : "Tasks"} · {block.linkedProjects.length} {block.linkedProjects.length === 1 ? "Project" : "Projects"}
            </p>
          </div>
          <Button
            aria-label={`${expanded ? "Collapse" : "Expand"} ${block.title}`}
            aria-controls={contentId}
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
            ref={toggleRef}
            size="sm"
            variant="ghost"
          >
            {expanded ? "Hide" : "Edit"}
          </Button>
        </div>
        <div
          className={spacingStyles.cardStack}
          hidden={!expanded}
          id={contentId}
        >
        <TimeBlockDetailsForm
          block={block}
          disabled={disabled}
          onUpdate={props.onUpdate}
        />
        <details>
          <summary className={cn("cursor-pointer", typographyStyles.metricLabel, colorStyles.text.muted, colorStyles.focusRing)}>
            Timing actions
          </summary>
          <div className="pt-card-compact">
            <TimeBlockTimingControls
              block={block}
              disabled={disabled}
              locked={block.locked}
              onDuplicate={props.onDuplicate}
              onMove={props.onMove}
              onResize={props.onResize}
              onSplit={props.onSplit}
            />
          </div>
        </details>
        <TimeBlockLinks {...props} />
        <div className={spacingStyles.cluster}>
          <Button disabled={disabled} onClick={() => props.onLock(!block.locked)} size="sm" variant="secondary">{block.locked ? "Unlock" : "Lock"}</Button>
          {props.mergeWithNextId ? <Button disabled={protectedAction} onClick={() => void mergeWithNext()} size="sm" variant="secondary">Merge next</Button> : null}
          <TimeBlockDeleteAction
            disabled={protectedAction}
            onDelete={props.onDelete}
            title={block.title}
          />
        </div>
        </div>
      </div>
    </Card>
  );
}

export { TimeBlockCard };
