"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { fieldClassName, fieldGroupClassName, labelClassName } from "@/components/forms/fieldStyles";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type BreakdownPanelProps = {
  readonly disabled: boolean;
  readonly onCancel: () => void;
  readonly onSubmit: (titles: readonly string[]) => Promise<boolean>;
};

function BreakdownPanel({ disabled, onCancel, onSubmit }: BreakdownPanelProps) {
  const [tasks, setTasks] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const titles = tasks.split("\n").map((title) => title.trim()).filter(Boolean);
    const saved = await onSubmit(titles);
    if (saved) setTasks("");
  }

  return (
    <Card tone="subtle">
      <form className={spacingStyles.cardStack} onSubmit={handleSubmit}>
        <div className={spacingStyles.detailStack}>
          <h3 className={typographyStyles.cardTitle}>Break this Project down</h3>
          <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
            Write one concrete Task per line. Atlas will keep this order.
          </p>
        </div>
        <div className={fieldGroupClassName}>
          <label className={labelClassName} htmlFor="breakdown-tasks">Tasks</label>
          <textarea autoFocus className={fieldClassName} id="breakdown-tasks" onChange={(event) => setTasks(event.target.value)} required rows={6} value={tasks} />
        </div>
        <div className={spacingStyles.cluster}>
          <Button disabled={disabled || tasks.trim().length === 0} type="submit">{disabled ? "Adding…" : "Add Tasks"}</Button>
          <Button disabled={disabled} onClick={onCancel} variant="ghost">Cancel</Button>
        </div>
      </form>
    </Card>
  );
}

export { BreakdownPanel };
