"use client";

import { Button } from "@/components/ui/Button";
import { PageStatus } from "@/components/ui/PageStatus";
import { useFeatures } from "@/features/FeatureProvider";
import { DailyPlanner } from "@/features/planner/components/DailyPlanner";
import { useDailyPlanner } from "@/features/planner/hooks/useDailyPlanner";

type DailyPlannerClientProps = { readonly initialTaskId?: string | null };

function DailyPlannerClient({ initialTaskId }: DailyPlannerClientProps) {
  const { planner } = useFeatures();
  const state = useDailyPlanner(planner);

  if (state.isLoading && !state.data) {
    return <PageStatus description="Gathering today's capacity, work, and planning context." title="Preparing your day" />;
  }

  if (!state.data) {
    return (
      <PageStatus
        action={<Button onClick={state.reload} variant="secondary">Try again</Button>}
        description={state.error ?? "Atlas could not prepare the Daily Planner."}
        title="Planner is unavailable"
        tone="danger"
      />
    );
  }

  return (
    <DailyPlanner
      announcement={state.announcement}
      data={state.data}
      disabled={state.isSaving}
      error={state.error}
      initialTaskId={initialTaskId}
      onCreate={state.createTimeBlock}
      onCalendarChanged={state.reload}
      onDelete={state.deleteTimeBlock}
      onDuplicate={state.duplicateTimeBlock}
      onLinkProject={state.linkProject}
      onLinkTask={state.linkTask}
      onLock={state.setTimeBlockLocked}
      onMerge={state.mergeTimeBlocks}
      onMove={state.moveTimeBlock}
      onMoveTask={state.moveTask}
      onPlaceTask={state.placeTask}
      onPlaceTasks={state.placeTasks}
      onRemoveTask={state.removeTask}
      onResize={state.resizeTimeBlock}
      onScheduleTask={state.scheduleTaskInSlot}
      onSaveDraft={() => void state.saveDraft()}
      onSplit={state.splitTimeBlock}
      onStartDay={() => void state.startDay()}
      onUnlinkProject={state.unlinkProject}
      onUnlinkTask={state.unlinkTask}
      onUnscheduleTask={state.unscheduleTask}
      onUpdate={state.updateTimeBlock}
    />
  );
}

export { DailyPlannerClient };
