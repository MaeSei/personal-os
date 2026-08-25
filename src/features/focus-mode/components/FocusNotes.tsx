"use client";

import { useState, type FormEvent } from "react";

import {
  fieldClassName,
  fieldGroupClassName,
  labelClassName,
} from "@/components/forms/fieldStyles";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MAX_FOCUS_NOTES_LENGTH } from "@/domain";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type FocusNotesProps = {
  readonly disabled: boolean;
  readonly notes: string | null;
  readonly onSave: (notes: string | null) => Promise<void>;
};

/** Session-scoped working notes saved explicitly to avoid surprising writes. */
function FocusNotes({ disabled, notes, onSave }: FocusNotesProps) {
  const [draft, setDraft] = useState(notes ?? "");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSave(draft.trim() || null);
  }

  return (
    <Card as="article" padding="lg">
      <form className={spacingStyles.cardStack} onSubmit={(event) => void submit(event)}>
        <div>
          <h3 className={typographyStyles.cardTitle}>Notes</h3>
          <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
            Keep useful context beside the work in progress.
          </p>
        </div>
        <div className={fieldGroupClassName}>
          <label className={labelClassName} htmlFor="focus-notes">Session notes</label>
          <textarea
            className={cn(fieldClassName, "min-h-40 resize-y")}
            disabled={disabled}
            id="focus-notes"
            maxLength={MAX_FOCUS_NOTES_LENGTH}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Capture decisions, observations, or where to resume."
            value={draft}
          />
        </div>
        <div className={spacingStyles.cluster}>
          <Button disabled={disabled || draft.trim() === (notes ?? "")} type="submit">
            Save notes
          </Button>
        </div>
      </form>
    </Card>
  );
}

export { FocusNotes, type FocusNotesProps };
