import type { FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { initialAreas, type Area } from "@/domain";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type AreaStepProps = {
  error: string | null;
  onBack: () => void;
  onContinue: () => void;
  onToggle: (area: Area) => void;
  selectedAreas: readonly Area[];
};

function AreaStep({
  error,
  onBack,
  onContinue,
  onToggle,
  selectedAreas,
}: AreaStepProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onContinue();
  }

  return (
    <PageContainer>
      <div className={cn(spacingStyles.contentNarrow, spacingStyles.pageStack)}>
        <PageHeader
          description="Areas are the stable parts of life you want Atlas to protect. Start small; this can grow with you."
          eyebrow="Step 2 of 4"
          title="Choose your initial Areas."
        />
        <form onSubmit={handleSubmit}>
          <Card padding="lg">
            <fieldset className={spacingStyles.cardStack}>
              <legend className="sr-only">Select initial Areas</legend>
              <div className="grid gap-card sm:grid-cols-2">
                {initialAreas.map((area) => {
                  const isSelected = selectedAreas.some(
                    (selected) => selected.id === area.id,
                  );

                  return (
                    <Card
                      key={area.id}
                      padding="sm"
                      tone={isSelected ? "accent" : "subtle"}
                    >
                      <label className="flex cursor-pointer items-center gap-cluster">
                        <input
                          checked={isSelected}
                          className="size-5 shrink-0 accent-accent"
                          onChange={() => onToggle(area)}
                          type="checkbox"
                        />
                        <span
                          className={cn(
                            "flex min-w-0 flex-col",
                            spacingStyles.detailStack,
                          )}
                        >
                          <span
                            className={cn(
                              typographyStyles.cardTitle,
                              colorStyles.text.primary,
                            )}
                          >
                            <span aria-hidden="true">{area.icon}</span>{" "}
                            {area.title}
                          </span>
                          <span
                            className={cn(
                              typographyStyles.description,
                              colorStyles.text.muted,
                            )}
                          >
                            {area.description}
                          </span>
                        </span>
                      </label>
                    </Card>
                  );
                })}
              </div>
              {error ? (
                <p className="text-danger" role="alert">
                  {error}
                </p>
              ) : null}
              <div className={spacingStyles.cluster}>
                <Button disabled={selectedAreas.length === 0} size="lg" type="submit">
                  Continue
                </Button>
                <Button onClick={onBack} size="lg" variant="ghost">
                  Back
                </Button>
              </div>
            </fieldset>
          </Card>
        </form>
      </div>
    </PageContainer>
  );
}

export { AreaStep, type AreaStepProps };
