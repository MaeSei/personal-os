"use client";

import type { FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { fieldClassName, fieldGroupClassName, labelClassName } from "@/components/forms/fieldStyles";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type TaskConvertFormProps = {
  readonly disabled: boolean;
  readonly onCancel: () => void;
  readonly onSubmit: (outcome: string) => Promise<boolean>;
};

function TaskConvertForm({ disabled, onCancel, onSubmit }: TaskConvertFormProps) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await onSubmit(String(form.get("outcome") ?? ""));
  }

  return (
    <Card as="article" padding="lg" tone="subtle">
      <form className={spacingStyles.cardStack} onSubmit={submit}>
        <div className={spacingStyles.detailStack}>
          <h3 className={typographyStyles.cardTitle}>Convert to Project</h3>
          <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
            The Task becomes a first-class Project. Any child work moves with it.
          </p>
        </div>
        <div className={fieldGroupClassName}>
          <label className={labelClassName} htmlFor="task-project-outcome">Desired outcome</label>
          <textarea autoFocus className={fieldClassName} id="task-project-outcome" maxLength={500} name="outcome" required rows={3} />
        </div>
        <div className={spacingStyles.cluster}>
          <Button disabled={disabled} type="submit">{disabled ? "Converting…" : "Create Project"}</Button>
          <Button disabled={disabled} onClick={onCancel} variant="ghost">Cancel</Button>
        </div>
      </form>
    </Card>
  );
}

export { TaskConvertForm };
