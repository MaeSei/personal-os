"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Project } from "@/domain";
import {
  fieldClassName,
  fieldGroupClassName,
  labelClassName,
} from "@/components/forms/fieldStyles";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type ProjectFirstTaskPromptProps = {
  readonly disabled: boolean;
  readonly error: string | null;
  readonly onAdd: (title: string) => Promise<boolean>;
  readonly onLater: () => void;
  readonly project: Project;
};

function ProjectFirstTaskPrompt({
  disabled,
  error,
  onAdd,
  onLater,
  project,
}: ProjectFirstTaskPromptProps) {
  const [isAdding, setIsAdding] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await onAdd(String(form.get("title") ?? ""));
  }

  return (
    <Card as="article" padding="lg">
      <div className={spacingStyles.cardStack}>
        <div className={spacingStyles.detailStack}>
          <p className={cn(typographyStyles.label, colorStyles.text.accent)}>
            Project created
          </p>
          <h3 className={cn(typographyStyles.sectionTitle, colorStyles.text.primary)}>
            {project.title}
          </h3>
          <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
            Add one concrete Task now, or leave the outcome ready for later.
          </p>
        </div>
        {error ? (
          <p className={cn(typographyStyles.description, "text-danger")} role="alert">
            {error}
          </p>
        ) : null}
        {isAdding ? (
          <form className={spacingStyles.cardStack} onSubmit={handleSubmit}>
            <div className={fieldGroupClassName}>
              <label className={labelClassName} htmlFor="first-task-title">
                First Task
              </label>
              <input
                autoFocus
                className={fieldClassName}
                id="first-task-title"
                maxLength={200}
                name="title"
                required
              />
            </div>
            <div className={spacingStyles.cluster}>
              <Button disabled={disabled} type="submit">
                {disabled ? "Adding…" : "Add first Task"}
              </Button>
              <Button
                disabled={disabled}
                onClick={() => setIsAdding(false)}
                variant="ghost"
              >
                Back
              </Button>
            </div>
          </form>
        ) : (
          <div className={spacingStyles.cluster}>
            <Button onClick={() => setIsAdding(true)}>Add first Task</Button>
            <Button onClick={onLater} variant="secondary">
              Do this later
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

export { ProjectFirstTaskPrompt };
