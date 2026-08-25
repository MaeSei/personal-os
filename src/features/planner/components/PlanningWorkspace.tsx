"use client";

import { useMemo, useRef, useState } from "react";

import type { DailyPlannerData } from "@/features/contracts/PlannerFeature";
import { CalendarEvents } from "@/features/planner/components/CalendarEvents";
import { PlanningArea } from "@/features/planner/components/PlanningArea";
import {
  TimeBlocksSection,
} from "@/features/planner/components/TimeBlocksSection";
import type { TimeBlockActions } from "@/features/planner/components/TimeBlockActions";
import { WorkspaceCapacity } from "@/features/planner/components/WorkspaceCapacity";
import { WorkspaceContextRail } from "@/features/planner/components/WorkspaceContextRail";
import { WorkspacePanel } from "@/features/planner/components/WorkspacePanel";
import { WorkspaceSearch } from "@/features/planner/components/WorkspaceSearch";
import { searchWorkspace } from "@/features/planner/workspaceSearch";
import { spacingStyles } from "@/theme/spacing";

type PlanningWorkspaceProps = TimeBlockActions & {
  readonly data: DailyPlannerData;
  readonly disabled: boolean;
  readonly initialTaskId?: string | null;
  readonly onMoveTask: (taskId: string, direction: "down" | "up") => Promise<boolean>;
  readonly onPlaceTask: (taskId: string, beforeTaskId?: string | null) => Promise<boolean>;
  readonly onPlaceTasks: (taskIds: readonly string[]) => Promise<boolean>;
  readonly onRemoveTask: (taskId: string) => Promise<boolean>;
  readonly onUnscheduleTask: (taskId: string) => void;
};

function PlanningWorkspace(props: PlanningWorkspaceProps) {
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const planFocusRef = useRef<HTMLDivElement>(null);
  const results = useMemo(
    () => searchWorkspace(props.data, query),
    [props.data, query],
  );
  const resultCount = results.projects.length + results.tasks.length + results.inbox.length;
  const isFiltering = query.trim().length > 0;

  function changeQuery(value: string) {
    setQuery(value);
    setSelectedIds(new Set());
  }

  function selectTask(taskId: string, selected: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (selected) next.add(taskId);
      else next.delete(taskId);
      return next;
    });
  }

  async function addSelected() {
    if (selectedIds.size === 0) return;
    if (await props.onPlaceTasks([...selectedIds])) {
      setSelectedIds(new Set());
      planFocusRef.current?.focus();
    }
  }

  async function addTask(taskId: string) {
    selectTask(taskId, false);
    if (await props.onPlaceTask(taskId)) planFocusRef.current?.focus();
  }

  return (
    <div aria-busy={props.disabled} className={spacingStyles.cardStack}>
      <WorkspaceSearch
        onChange={changeQuery}
        query={query}
        resultCount={resultCount}
      />
      <div className="grid items-start gap-card md:grid-cols-[minmax(0,1.45fr)_minmax(16rem,0.8fr)]">
        <div className={spacingStyles.cardStack}>
          <WorkspacePanel
            count={props.data.commitments.length}
            description="Choose what belongs today, then reserve attention only where useful."
            title="Planner"
          >
            <div className={spacingStyles.cardStack}>
              <WorkspaceCapacity
                attention={props.data.attention}
                availableTime={props.data.availableTime}
              />
              <PlanningArea
                commitments={props.data.commitments}
                disabled={props.disabled}
                focusRef={planFocusRef}
                onMove={props.onMoveTask}
                onPlace={props.onPlaceTask}
                onRemove={props.onRemoveTask}
                onUnschedule={props.onUnscheduleTask}
                suggestions={props.data.suggestions}
                timeBlocks={props.data.timeBlocks}
              />
              <TimeBlocksSection
                {...props}
                commitments={props.data.commitments}
                projects={props.data.projects}
                taskPool={props.data.taskPool}
                timeBlocks={props.data.timeBlocks}
              />
            </div>
          </WorkspacePanel>
          <WorkspacePanel
            count={props.data.calendar.events.length}
            defaultExpanded={props.data.calendar.events.length > 0}
            description="External commitments remain read-only planning context."
            title="Calendar"
          >
            <CalendarEvents calendar={props.data.calendar} />
          </WorkspacePanel>
        </div>
        <WorkspaceContextRail
          disabled={props.disabled}
          isFiltering={isFiltering}
          onAdd={(taskId) => void addTask(taskId)}
          onAddSelected={() => void addSelected()}
          onClearSelection={() => setSelectedIds(new Set())}
          onSelect={selectTask}
          results={results}
          selectedIds={selectedIds}
        />
      </div>
    </div>
  );
}

export { PlanningWorkspace };
