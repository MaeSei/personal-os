"use client";

import { useRouter } from "next/navigation";

import { AreaStep } from "@/features/onboarding/components/AreaStep";
import { FinishStep } from "@/features/onboarding/components/FinishStep";
import { ProjectStep } from "@/features/onboarding/components/ProjectStep";
import { WelcomeStep } from "@/features/onboarding/components/WelcomeStep";
import { useOnboarding } from "@/features/onboarding/hooks/useOnboarding";
import type { OnboardingRepository } from "@/repositories/OnboardingRepository";
import { LocalStorageRepository } from "@/repositories/LocalStorageRepository";

const onboardingRepository: OnboardingRepository = new LocalStorageRepository();

function Onboarding() {
  const router = useRouter();
  const onboarding = useOnboarding(onboardingRepository);

  if (onboarding.step === "welcome") {
    return <WelcomeStep onContinue={onboarding.openAreas} />;
  }

  if (onboarding.step === "areas") {
    return (
      <AreaStep
        error={onboarding.error}
        onBack={() => onboarding.setStep("welcome")}
        onContinue={onboarding.openProject}
        onToggle={onboarding.toggleArea}
        selectedAreas={onboarding.areas}
      />
    );
  }

  if (onboarding.step === "project") {
    return (
      <ProjectStep
        areas={onboarding.areas}
        energyLevel={onboarding.projectEnergyLevel}
        error={onboarding.error}
        isSaving={onboarding.isSaving}
        onAreaChange={onboarding.setProjectAreaId}
        onBack={() => {
          onboarding.setError(null);
          onboarding.setStep("areas");
        }}
        onEnergyLevelChange={onboarding.setProjectEnergyLevel}
        onNextActionChange={onboarding.setProjectNextAction}
        onOutcomeChange={onboarding.setProjectOutcome}
        onSubmit={onboarding.complete}
        onTitleChange={onboarding.setProjectTitle}
        projectAreaId={onboarding.projectAreaId}
        projectNextAction={onboarding.projectNextAction}
        projectOutcome={onboarding.projectOutcome}
        projectTitle={onboarding.projectTitle}
      />
    );
  }

  if (!onboarding.createdProject) {
    return null;
  }

  return (
    <FinishStep
      areas={onboarding.areas}
      nextActionTitle={onboarding.projectNextAction}
      onFinish={() => router.replace("/")}
      project={onboarding.createdProject}
    />
  );
}

export { Onboarding };
