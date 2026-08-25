import { MorningStepActions } from "@/features/morning/components/MorningStepActions";
import { TimeBlocksSection } from "@/features/planner/components/TimeBlocksSection";
import type { useDailyPlanner } from "@/features/planner/hooks/useDailyPlanner";
import { spacingStyles } from "@/theme/spacing";

type MorningTimeBlocksStepProps = {
  readonly onBack: () => void;
  readonly onNext: () => void;
  readonly planning: ReturnType<typeof useDailyPlanner>;
};

function MorningTimeBlocksStep({
  onBack,
  onNext,
  planning,
}: MorningTimeBlocksStepProps) {
  const data = planning.data;
  if (!data) return null;

  return (
    <div className={spacingStyles.cardStack}>
      <TimeBlocksSection
        {...data}
        disabled={planning.isSaving}
        onCreate={planning.createTimeBlock}
        onDelete={planning.deleteTimeBlock}
        onDuplicate={planning.duplicateTimeBlock}
        onLinkProject={planning.linkProject}
        onLinkTask={planning.linkTask}
        onLock={planning.setTimeBlockLocked}
        onMerge={planning.mergeTimeBlocks}
        onMove={planning.moveTimeBlock}
        onResize={planning.resizeTimeBlock}
        onScheduleTask={planning.scheduleTaskInSlot}
        onSplit={planning.splitTimeBlock}
        onUnlinkProject={planning.unlinkProject}
        onUnlinkTask={planning.unlinkTask}
        onUpdate={planning.updateTimeBlock}
      />
      <MorningStepActions
        disabled={planning.isSaving}
        nextLabel="Review the day"
        onBack={onBack}
        onNext={onNext}
      />
    </div>
  );
}

export { MorningTimeBlocksStep };
