import type { FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import type { Area, AreaId, EnergyCost } from "@/domain";
import { ProjectFields } from "@/features/onboarding/components/ProjectFields";
import { cn } from "@/lib/cn";
import { spacingStyles } from "@/theme/spacing";

type ProjectStepProps = {
  areas: readonly Area[];
  energyLevel: EnergyCost;
  error: string | null;
  isSaving: boolean;
  onAreaChange: (areaId: AreaId) => void;
  onBack: () => void;
  onEnergyLevelChange: (energyLevel: EnergyCost) => void;
  onNextActionChange: (nextAction: string) => void;
  onOutcomeChange: (outcome: string) => void;
  onSubmit: () => Promise<void>;
  onTitleChange: (title: string) => void;
  projectAreaId: AreaId | null;
  projectNextAction: string;
  projectOutcome: string;
  projectTitle: string;
};

function ProjectStep({
  areas,
  energyLevel,
  error,
  isSaving,
  onAreaChange,
  onBack,
  onEnergyLevelChange,
  onNextActionChange,
  onOutcomeChange,
  onSubmit,
  onTitleChange,
  projectAreaId,
  projectNextAction,
  projectOutcome,
  projectTitle,
}: ProjectStepProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSubmit();
  }

  return (
    <PageContainer>
      <div className={cn(spacingStyles.contentNarrow, spacingStyles.pageStack)}>
        <PageHeader
          description="Describe what will be true when this Project is complete. Name the destination only after it is clear."
          eyebrow="Step 3 of 4"
          title="Start with the outcome."
        />
        <Card padding="lg">
          <form
            aria-busy={isSaving}
            className={spacingStyles.cardStack}
            onSubmit={handleSubmit}
          >
            <ProjectFields
              areas={areas}
              energyLevel={energyLevel}
              onAreaChange={onAreaChange}
              onEnergyLevelChange={onEnergyLevelChange}
              onNextActionChange={onNextActionChange}
              onOutcomeChange={onOutcomeChange}
              onTitleChange={onTitleChange}
              projectAreaId={projectAreaId}
              projectNextAction={projectNextAction}
              projectOutcome={projectOutcome}
              projectTitle={projectTitle}
            />
            {error ? (
              <p className="text-danger" role="alert">
                {error}
              </p>
            ) : null}
            <div className={spacingStyles.cluster}>
              <Button
                disabled={
                  !projectTitle.trim() ||
                  !projectNextAction.trim() ||
                  !projectOutcome.trim() ||
                  !projectAreaId ||
                  isSaving
                }
                size="lg"
                type="submit"
              >
                {isSaving ? "Creating…" : "Create Project"}
              </Button>
              <Button
                disabled={isSaving}
                onClick={onBack}
                size="lg"
                variant="ghost"
              >
                Back
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </PageContainer>
  );
}

export { ProjectStep, type ProjectStepProps };
