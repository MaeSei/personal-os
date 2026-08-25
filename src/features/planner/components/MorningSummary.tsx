import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import type { DailyPlannerData } from "@/features/contracts/PlannerFeature";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type MorningSummaryProps = DailyPlannerData["morning"];

function MorningSummary({
  activeProjectCount,
  availableTaskCount,
  dateLabel,
  inboxCount,
  name,
}: MorningSummaryProps) {
  const metrics = [
    ["Active Projects", activeProjectCount],
    ["Available Tasks", availableTaskCount],
    ["Inbox", inboxCount],
  ] as const;

  return (
    <section aria-labelledby="morning-summary-title" className={spacingStyles.section}>
      <PageHeader
        action={<ButtonLink href="/" variant="secondary">Workspace</ButtonLink>}
        description="Choose a small, realistic day with Projects and Tasks still in view."
        eyebrow={dateLabel}
        title={<>Good morning, {name}.</>}
      />
      <h2 className="sr-only" id="morning-summary-title">Morning summary</h2>
      <Card padding="sm" tone="subtle">
        <dl className={cn(spacingStyles.cardGrid, "sm:grid-cols-3")}>
          {metrics.map(([label, value]) => (
            <div className={spacingStyles.detailStack} key={label}>
              <dt className={cn(typographyStyles.label, colorStyles.text.muted)}>
                {label}
              </dt>
              <dd className={cn(typographyStyles.cardTitle, colorStyles.text.primary)}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </Card>
    </section>
  );
}

export { MorningSummary };
