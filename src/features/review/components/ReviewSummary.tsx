import { Card } from "@/components/ui/Card";
import { Divider } from "@/components/ui/Divider";
import { Section } from "@/components/ui/Section";
import type { ReactNode } from "react";
import type { DailyReviewResult } from "@/features/review/types";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type ReviewSummaryProps = {
  action?: ReactNode;
  result: DailyReviewResult;
};

function ReviewSummary({ action, result }: ReviewSummaryProps) {
  const metrics = [
    ["Energy", result.energy],
    ["Stress", result.stress],
    ["Motivation", result.motivation],
  ] as const;

  return (
    <Section aria-live="polite" id="review-summary" title="Today's attention">
      <Card as="article" padding="lg" tone="accent">
        <div className={spacingStyles.cardStack}>
          <div>
            <p
              className={cn(
                typographyStyles.metricLabel,
                colorStyles.text.accent,
              )}
            >
              Attention Budget
            </p>
            <output
              aria-label={`Attention budget: ${result.attentionBudget} out of 100`}
              className={cn(
                typographyStyles.metric,
                colorStyles.text.primary,
              )}
            >
              {result.attentionBudget}%
            </output>
          </div>

          <dl className="grid gap-card-compact sm:grid-cols-3 sm:gap-cluster">
            {metrics.map(([label, value]) => (
              <div className={spacingStyles.detailStack} key={label}>
                <dt
                  className={cn(
                    typographyStyles.description,
                    colorStyles.text.muted,
                  )}
                >
                  {label}
                </dt>
                <dd
                  className={cn(
                    typographyStyles.cardTitle,
                    colorStyles.text.primary,
                  )}
                >
                  {value}/5
                </dd>
              </div>
            ))}
          </dl>

          <Divider />
          <p
            className={cn(
              "whitespace-pre-line",
              typographyStyles.lead,
              colorStyles.text.primary,
            )}
          >
            {result.summary}
          </p>
          {action ? (
            <>
              <Divider />
              <div className={spacingStyles.cluster}>{action}</div>
            </>
          ) : null}
        </div>
      </Card>
    </Section>
  );
}

export { ReviewSummary, type ReviewSummaryProps };
