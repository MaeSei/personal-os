import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import type { DailyWrapUp } from "@/domain";
import { WrapUpMetrics } from "@/features/wrap-up/components/WrapUpMetrics";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type WrapUpCompleteProps = { readonly review: DailyWrapUp };

function WrapUpComplete({ review }: WrapUpCompleteProps) {
  const carried = review.tasks.filter(({ carriedForward }) => carriedForward);
  return (
    <div className={spacingStyles.cardStack}>
      <Card padding="lg" tone="accent">
        <div className={spacingStyles.cardStack}>
          <Badge variant="success">Wrap-up saved</Badge>
          <div className={spacingStyles.detailStack}>
            <h2 className={cn(typographyStyles.display, colorStyles.text.primary)}>
              Today is recorded.
            </h2>
            <p className={cn(typographyStyles.lead, colorStyles.text.muted)}>
              The plan and outcome are preserved as evidence, without a score.
            </p>
          </div>
          <WrapUpMetrics metrics={review.metrics} />
          {review.notes ? (
            <div className={spacingStyles.detailStack}>
              <p className={cn(typographyStyles.label, colorStyles.text.muted)}>Notes</p>
              <p className={cn(typographyStyles.body, "whitespace-pre-wrap")}>{review.notes}</p>
            </div>
          ) : null}
          <div className={spacingStyles.detailStack}>
            <p className={cn(typographyStyles.label, colorStyles.text.muted)}>Tomorrow</p>
            {carried.length > 0 ? (
              <ul className={spacingStyles.detailStack}>
                {carried.map((task) => <li key={task.taskId}>{task.title}</li>)}
              </ul>
            ) : (
              <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
                Nothing was carried forward automatically.
              </p>
            )}
          </div>
          <div className={spacingStyles.cluster}>
            <ButtonLink href="/" size="lg">Workspace</ButtonLink>
            <ButtonLink href="/morning" size="lg" variant="secondary">
              Morning Planning
            </ButtonLink>
          </div>
        </div>
      </Card>
    </div>
  );
}

export { WrapUpComplete };
