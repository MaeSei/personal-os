import { DayPlanActions } from "@/features/planner/components/DayPlanActions";
import { PlanningWorkspace } from "@/features/planner/components/PlanningWorkspace";
import type { useDailyPlanner } from "@/features/planner/hooks/useDailyPlanner";
import { spacingStyles } from "@/theme/spacing";

type MorningAdjustmentStepProps = {
  readonly onStartDay: () => void;
  readonly planning: ReturnType<typeof useDailyPlanner>;
};

function MorningAdjustmentStep({
  onStartDay,
  planning,
}: MorningAdjustmentStepProps) {
  const data = planning.data;
  if (!data) return null;

  return (
    <div className={spacingStyles.cardStack}>
      <PlanningWorkspace
        data={data}
        disabled={planning.isSaving}
        onCreate={planning.createTimeBlock}
        onDelete={planning.deleteTimeBlock}
        onDuplicate={planning.duplicateTimeBlock}
        onLinkProject={planning.linkProject}
        onLinkTask={planning.linkTask}
        onLock={planning.setTimeBlockLocked}
        onMerge={planning.mergeTimeBlocks}
        onMove={planning.moveTimeBlock}
        onMoveTask={planning.moveTask}
        onPlaceTask={planning.placeTask}
        onPlaceTasks={planning.placeTasks}
        onRemoveTask={planning.removeTask}
        onResize={planning.resizeTimeBlock}
        onSplit={planning.splitTimeBlock}
        onUnlinkProject={planning.unlinkProject}
        onUnlinkTask={planning.unlinkTask}
        onUnscheduleTask={planning.unscheduleTask}
        onUpdate={planning.updateTimeBlock}
      />
      <DayPlanActions
        disabled={planning.isSaving}
        onSaveDraft={() => void planning.saveDraft()}
        onStartDay={onStartDay}
        persisted={data.plan.persisted}
        status={data.plan.status}
      />
    </div>
  );
}

export { MorningAdjustmentStep };
