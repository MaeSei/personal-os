import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { PageContainer } from "@/components/ui/PageContainer";
import { Section } from "@/components/ui/Section";
import type { FocusModePlan } from "@/domain";
import { BlockedSection } from "@/features/mission-control/components/BlockedSection";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type FocusModeProps = {
  readonly completionError: string | null;
  readonly completionMessage: string;
  readonly isCompleting: boolean;
  readonly onCompleteCurrent: () => void;
  readonly plan: FocusModePlan;
};

/** A deliberately narrow view of now, next, and anything preventing progress. */
function FocusMode({
  completionError,
  completionMessage,
  isCompleting,
  onCompleteCurrent,
  plan,
}: FocusModeProps) {
  return (
    <PageContainer>
      <div className={cn(spacingStyles.contentNarrow, spacingStyles.pageStack)}>
        <section
          aria-labelledby="current-focus-title"
          className={spacingStyles.section}
          id="current-focus"
        >
          <h1
            className={cn(
              typographyStyles.sectionTitle,
              colorStyles.text.primary,
            )}
            id="current-focus-title"
          >
            Current Focus
          </h1>
          <Card aria-busy={isCompleting} padding="lg" tone="accent">
            <div className={spacingStyles.cardStack}>
              <p
                className={cn(
                  typographyStyles.display,
                  colorStyles.text.primary,
                )}
              >
                {plan.currentFocus?.title ?? "Nothing needs your attention."}
              </p>
              {plan.currentFocus?.description ? (
                <p
                  className={cn(
                    typographyStyles.lead,
                    colorStyles.text.muted,
                  )}
                >
                  {plan.currentFocus.description}
                </p>
              ) : null}
              {completionError ? (
                <p
                  className={cn(typographyStyles.description, "text-danger")}
                  role="alert"
                >
                  {completionError}
                </p>
              ) : null}
              <div className={spacingStyles.cluster}>
                {plan.currentFocus ? (
                  <Button
                    disabled={isCompleting}
                    onClick={onCompleteCurrent}
                    size="lg"
                  >
                    {isCompleting ? "Completing…" : "Complete focus item"}
                  </Button>
                ) : null}
                <ButtonLink href="/" size="lg" variant="ghost">
                  Mission Control
                </ButtonLink>
              </div>
            </div>
          </Card>
        </section>

        <p aria-live="polite" className="sr-only" role="status">
          {completionMessage}
        </p>

        <Section id="next-action" title="Next Action">
          <Card padding="lg">
            <div className={spacingStyles.cardStack}>
              <p
                className={cn(
                  typographyStyles.sectionTitle,
                  colorStyles.text.primary,
                )}
              >
                {plan.nextAction?.title ?? "No next action planned."}
              </p>
              {plan.nextAction?.description ? (
                <p
                  className={cn(
                    typographyStyles.description,
                    colorStyles.text.muted,
                  )}
                >
                  {plan.nextAction.description}
                </p>
              ) : null}
            </div>
          </Card>
        </Section>

        <BlockedSection items={plan.blockedItems} />
      </div>
    </PageContainer>
  );
}

export { FocusMode, type FocusModeProps };
