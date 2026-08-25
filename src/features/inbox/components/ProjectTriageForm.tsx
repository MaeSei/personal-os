"use client";

import { type FormEvent, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/Button";
import type { Area, InboxProjectInput } from "@/domain";
import {
  fieldClassName,
  fieldGroupClassName,
  labelClassName,
} from "@/components/forms/fieldStyles";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";
import { cn } from "@/lib/cn";

type ProjectTriageFormProps = {
  readonly areas: readonly Area[];
  readonly disabled: boolean;
  readonly initialTitle: string;
  readonly onBack: () => void;
  readonly onSubmit: (input: InboxProjectInput) => Promise<boolean>;
};

function ProjectTriageForm({
  areas,
  disabled,
  initialTitle,
  onBack,
  onSubmit,
}: ProjectTriageFormProps) {
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    await onSubmit({
      areaId: String(form.get("areaId") ?? ""),
      description: String(form.get("description") ?? "").trim() || null,
      outcome: String(form.get("outcome") ?? ""),
      title: String(form.get("title") ?? ""),
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onBack();
    }
  }

  return (
    <form
      aria-busy={disabled}
      className={spacingStyles.cardStack}
      onKeyDown={handleKeyDown}
      onSubmit={handleSubmit}
    >
      <div className={fieldGroupClassName}>
        <label className={labelClassName} htmlFor="project-area">
          Area
        </label>
        <select
          autoFocus
          className={fieldClassName}
          defaultValue=""
          id="project-area"
          name="areaId"
          required
        >
          <option disabled value="">
            Choose an Area
          </option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.icon} {area.title}
            </option>
          ))}
        </select>
      </div>
      <div className={fieldGroupClassName}>
        <label className={labelClassName} htmlFor="project-title">
          Project title
        </label>
        <input
          className={fieldClassName}
          defaultValue={initialTitle}
          id="project-title"
          maxLength={200}
          name="title"
          required
        />
      </div>
      <div className={fieldGroupClassName}>
        <label className={labelClassName} htmlFor="project-outcome">
          Desired outcome
        </label>
        <textarea
          className={fieldClassName}
          id="project-outcome"
          maxLength={500}
          name="outcome"
          placeholder="What will be true when this is complete?"
          required
          rows={3}
        />
      </div>
      <details>
        <summary
          className={cn(
            "cursor-pointer",
            typographyStyles.metricLabel,
            colorStyles.text.accent,
            colorStyles.focusRing,
          )}
        >
          Add a description
        </summary>
        <textarea
          className={cn(fieldClassName, "mt-card-compact")}
          id="project-description"
          maxLength={1000}
          name="description"
          rows={4}
        />
      </details>
      <div className={spacingStyles.cluster}>
        <Button disabled={disabled} type="submit">
          {disabled ? "Creating…" : "Create Project"}
        </Button>
        <Button disabled={disabled} onClick={onBack} variant="ghost">
          Back
        </Button>
      </div>
    </form>
  );
}

export { ProjectTriageForm };
