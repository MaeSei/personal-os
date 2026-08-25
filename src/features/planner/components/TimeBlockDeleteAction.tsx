"use client";

import { useRef, useState, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type TimeBlockDeleteActionProps = {
  readonly disabled: boolean;
  readonly onDelete: () => Promise<boolean>;
  readonly title: string;
};

function TimeBlockDeleteAction({
  disabled,
  onDelete,
  title,
}: TimeBlockDeleteActionProps) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  async function remove() {
    if (deleting) return;
    setDeleting(true);
    if (!(await onDelete())) setDeleting(false);
  }

  function cancel() {
    setConfirming(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && !deleting) {
      event.preventDefault();
      cancel();
    }
  }

  if (!confirming) {
    return (
      <Button
        disabled={disabled}
        onClick={() => setConfirming(true)}
        ref={triggerRef}
        size="sm"
        variant="danger"
      >
        Delete
      </Button>
    );
  }

  return (
    <div
      aria-busy={deleting}
      aria-label={`Confirm deletion of ${title}`}
      className={cn("rounded-control bg-danger-soft p-card-compact", spacingStyles.detailStack)}
      onKeyDown={handleKeyDown}
      role="group"
    >
      <p className={cn(typographyStyles.description, colorStyles.text.danger)}>
        Delete this Time Block? Its linked Tasks remain in Atlas.
      </p>
      <div className={spacingStyles.cluster}>
        <Button
          autoFocus
          disabled={disabled || deleting}
          onClick={() => void remove()}
          size="sm"
          variant="danger"
        >
          {deleting ? "Deleting…" : "Delete Time Block"}
        </Button>
        <Button
          disabled={disabled || deleting}
          onClick={cancel}
          size="sm"
          variant="ghost"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

export { TimeBlockDeleteAction };
