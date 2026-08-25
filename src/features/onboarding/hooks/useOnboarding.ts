"use client";

import { useState } from "react";

import type { Area, AreaId, EnergyCost, Project } from "@/domain";
import type { ProjectFeature } from "@/features/contracts/ProjectFeature";

type OnboardingStep = "areas" | "finish" | "project" | "welcome";

function useOnboarding(
  projects: Pick<ProjectFeature, "completeOnboarding">,
) {
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [areas, setAreas] = useState<readonly Area[]>([]);
  const [projectAreaId, setProjectAreaId] = useState<AreaId | null>(null);
  const [projectEnergyLevel, setProjectEnergyLevel] = useState<EnergyCost>(3);
  const [projectNextAction, setProjectNextAction] = useState("");
  const [projectOutcome, setProjectOutcome] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [createdProject, setCreatedProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function toggleArea(area: Area) {
    setAreas((current) =>
      current.some((selected) => selected.id === area.id)
        ? current.filter((selected) => selected.id !== area.id)
        : [...current, area],
    );
    setProjectAreaId((current) => (current === area.id ? null : current));
    setError(null);
  }

  function openAreas() {
    setError(null);
    setStep("areas");
  }

  function openProject() {
    if (areas.length === 0) {
      setError("Choose at least one Area to continue.");
      return;
    }

    setProjectAreaId((current) => current ?? areas[0]?.id ?? null);
    setError(null);
    setStep("project");
  }

  async function complete(): Promise<void> {
    const title = projectTitle.trim();
    const outcome = projectOutcome.trim();
    const nextAction = projectNextAction.trim();

    if (!title || !outcome || !nextAction || !projectAreaId) {
      setError("Define the outcome, then add its first next action.");
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const project = await projects.completeOnboarding({
        areas,
        projectAreaId,
        projectEnergyLevel,
        projectNextAction: nextAction,
        projectOutcome: outcome,
        projectTitle: title,
      });

      setCreatedProject(project);
      setStep("finish");
    } catch {
      setError("Atlas could not save your setup. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return {
    areas,
    complete,
    createdProject,
    error,
    isSaving,
    openAreas,
    openProject,
    projectAreaId,
    projectEnergyLevel,
    projectNextAction,
    projectOutcome,
    projectTitle,
    setError,
    setProjectAreaId,
    setProjectEnergyLevel,
    setProjectNextAction,
    setProjectOutcome,
    setProjectTitle,
    setStep,
    step,
    toggleArea,
  };
}

export { useOnboarding };
export type { OnboardingStep };
