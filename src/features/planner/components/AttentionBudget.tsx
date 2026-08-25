import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import type { DailyPlannerData } from "@/features/contracts/PlannerFeature";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type AttentionBudgetProps = { readonly attention: DailyPlannerData["attention"] };

function AttentionBudget({ attention }: AttentionBudgetProps) {
  return (
    <Section
      description="Capacity informs suggestions, but it never schedules work for you."
      id="attention-budget"
      title="Attention Budget"
    >
      {attention ? (
        <Card>
          <div className={cn(spacingStyles.cardGrid, "md:grid-cols-[auto_1fr]")}>
            <div>
              <p className={cn(typographyStyles.metric, colorStyles.text.accent)}>{attention.budget}%</p>
              <p className={cn(typographyStyles.description, colorStyles.text.muted)}>Available attention</p>
            </div>
            <div className={spacingStyles.detailStack}>
              <div className={spacingStyles.cluster}>
                <Badge variant="neutral">Energy {attention.energy}/5</Badge>
                <Badge variant="neutral">Stress {attention.stress}/5</Badge>
                <Badge variant="neutral">Motivation {attention.motivation}/5</Badge>
              </div>
              <p className={cn("whitespace-pre-line", typographyStyles.description, colorStyles.text.muted)}>{attention.summary}</p>
              <ButtonLink href="/review" size="sm" variant="ghost">Review check-in</ButtonLink>
            </div>
          </div>
        </Card>
      ) : (
        <EmptyState
          action={<ButtonLink href="/review" size="sm" variant="secondary">Complete check-in</ButtonLink>}
          description="You can still plan manually. A short check-in makes the suggested area more capacity-aware."
          title="No check-in for today"
        />
      )}
    </Section>
  );
}

export { AttentionBudget };
