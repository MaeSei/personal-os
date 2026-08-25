import type { RefObject } from "react";

import type { DailyPlannerData } from "@/features/contracts/PlannerFeature";
import type { TimeBlockActions } from "@/features/planner/components/TimeBlockActions";
import { TimeBlockCard } from "@/features/planner/components/TimeBlockCard";
import { spacingStyles } from "@/theme/spacing";

type TimeBlockListProps = Pick<
  DailyPlannerData,
  "projects" | "timeBlocks"
> & TimeBlockActions & {
  readonly disabled: boolean;
  readonly focusRef: RefObject<HTMLDivElement | null>;
  readonly tasks: DailyPlannerData["taskPool"];
};

function TimeBlockList(props: TimeBlockListProps) {
  return (
    <div className={spacingStyles.cardStack}>
      {props.timeBlocks.map((block, index) => {
        const next = props.timeBlocks[index + 1];
        const mergeWithNextId = next && !next.locked && !block.locked &&
          block.end === next.start && block.type === next.type
          ? next.id
          : undefined;
        return (
          <TimeBlockCard
            block={block}
            disabled={props.disabled}
            key={block.id}
            mergeWithNextId={mergeWithNextId}
            onDelete={async () => {
              const deleted = await props.onDelete(block.id);
              if (deleted) requestAnimationFrame(() => props.focusRef.current?.focus());
              return deleted;
            }}
            onDuplicate={(start) => props.onDuplicate(block.id, start)}
            onLinkProject={(id) => props.onLinkProject(block.id, id)}
            onLinkTask={(id) => props.onLinkTask(block.id, id)}
            onLock={(locked) => props.onLock(block.id, locked)}
            onMerge={(nextId) => props.onMerge(block.id, nextId)}
            onMove={(start) => props.onMove(block.id, start)}
            onResize={(end) => props.onResize(block.id, end)}
            onSplit={(splitAt) => props.onSplit(block.id, splitAt)}
            onUnlinkProject={(id) => props.onUnlinkProject(block.id, id)}
            onUnlinkTask={(id) => props.onUnlinkTask(block.id, id)}
            onUpdate={(input) => props.onUpdate(block.id, input)}
            projects={props.projects}
            tasks={props.tasks}
          />
        );
      })}
    </div>
  );
}

export { TimeBlockList };
