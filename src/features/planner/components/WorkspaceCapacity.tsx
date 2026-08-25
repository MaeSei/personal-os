import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import type { DailyPlannerData } from "@/features/contracts/PlannerFeature";
import { formatDuration } from "@/features/planner/presentation";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type WorkspaceCapacityProps = Pick<DailyPlannerData, "attention" | "availableTime">;

function WorkspaceCapacity({ attention, availableTime }: WorkspaceCapacityProps) {
  return (
    <div className={cn("grid sm:grid-cols-3", spacingStyles.cardGrid)}>
      <div className={spacingStyles.detailStack}>
        <p className={cn(typographyStyles.label, colorStyles.text.muted)}>Attention</p>
        <p className={cn(typographyStyles.cardTitle, colorStyles.text.accent)}>
          {attention ? `${attention.budget}%` : "Not reviewed"}
        </p>
        {attention ? (
          <Badge variant="neutral">Energy {attention.energy}/5</Badge>
        ) : (
          <ButtonLink href="/review" size="sm" variant="ghost">Check in</ButtonLink>
        )}
      </div>
      <div className={spacingStyles.detailStack}>
        <p className={cn(typographyStyles.label, colorStyles.text.muted)}>Available</p>
        <p className={typographyStyles.cardTitle}>
          {formatDuration(availableTime.remainingMinutes)}
        </p>
        <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
          Of {formatDuration(availableTime.totalMinutes)}
        </p>
      </div>
      <div className={spacingStyles.detailStack}>
        <p className={cn(typographyStyles.label, colorStyles.text.muted)}>Time-boxed</p>
        <p className={typographyStyles.cardTitle}>
          {formatDuration(availableTime.plannedMinutes)}
        </p>
        <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
          Atlas reservations only
        </p>
      </div>
    </div>
  );
}

export { WorkspaceCapacity };
