import { Card } from "@/components/ui/Card";
import type { DailyWrapUpMetrics } from "@/domain";
import { formatDuration } from "@/features/planner/presentation";
import { formatActualDuration } from "@/features/wrap-up/presentation";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type WrapUpMetricsProps = { readonly metrics: DailyWrapUpMetrics };

function WrapUpMetrics({ metrics }: WrapUpMetricsProps) {
  const values = [
    ["Completed", String(metrics.completedTaskCount)],
    ["Unfinished", String(metrics.incompleteTaskCount)],
    ["Time-blocked", formatDuration(metrics.plannedMinutes)],
    ["Recorded focus", formatActualDuration(metrics.actualFocusSeconds || null)],
  ] as const;
  return (
    <div className={cn(spacingStyles.cardGrid, "grid-cols-2 lg:grid-cols-4")}>
      {values.map(([label, value]) => (
        <Card key={label} padding="sm">
          <p className={cn(typographyStyles.label, colorStyles.text.muted)}>{label}</p>
          <p className={cn(typographyStyles.cardTitle, colorStyles.text.primary)}>{value}</p>
        </Card>
      ))}
    </div>
  );
}

export { WrapUpMetrics };
