"use client";

import type { Ref } from "react";

import { fieldClassName } from "@/components/forms/fieldStyles";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { spacingStyles } from "@/theme/spacing";

type CaptureFormProps = {
  readonly descriptionId: string;
  readonly inputId: string;
  readonly inputRef: Ref<HTMLInputElement>;
  readonly isSaving: boolean;
  readonly layout?: "inline" | "stacked";
  readonly onCancel?: () => void;
  readonly onSubmit: () => void;
  readonly onTitleChange: (title: string) => void;
  readonly title: string;
};

/** Shared title-only form for the desktop entry and mobile capture panel. */
function CaptureForm({
  descriptionId,
  inputId,
  inputRef,
  isSaving,
  layout = "inline",
  onCancel,
  onSubmit,
  onTitleChange,
  title,
}: CaptureFormProps) {
  const canCapture = title.trim().length > 0 && !isSaving;

  return (
    <form
      aria-busy={isSaving}
      className={cn(
        layout === "inline"
          ? "flex items-center gap-cluster"
          : spacingStyles.cardStack,
      )}
      onSubmit={(event) => {
        event.preventDefault();
        if (canCapture) onSubmit();
      }}
    >
      <label className="sr-only" htmlFor={inputId}>
        Capture a thought
      </label>
      <input
        aria-describedby={descriptionId}
        aria-keyshortcuts="C"
        autoCapitalize="sentences"
        autoComplete="off"
        className={cn(fieldClassName, "min-w-0 flex-1")}
        enterKeyHint="done"
        id={inputId}
        maxLength={200}
        onChange={(event) => onTitleChange(event.target.value)}
        placeholder="Capture a thought…"
        ref={inputRef}
        required
        value={title}
      />
      <div className={cn(spacingStyles.cluster, "items-center")}>
        <Button disabled={!canCapture} type="submit">
          {isSaving ? "Saving…" : "Capture"}
        </Button>
        {onCancel ? (
          <Button onClick={onCancel} type="button" variant="ghost">
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export { CaptureForm };
export type { CaptureFormProps };
