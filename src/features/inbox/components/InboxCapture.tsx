"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { motionStyles } from "@/theme/motion";
import { radiusStyles } from "@/theme/radius";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type InboxCaptureProps = {
  onCapture: (title: string) => Promise<boolean>;
};
const capturePanelId = "inbox-capture-panel";
const captureTitleId = "inbox-capture-title";
function InboxCapture({ onCapture }: InboxCaptureProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const canCapture = title.trim().length > 0 && !isSaving;

  function closeCapture() {
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canCapture) {
      return;
    }

    setIsSaving(true);
    const didCapture = await onCapture(title);
    setIsSaving(false);

    if (didCapture) {
      setTitle("");
      closeCapture();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeCapture();
    }
  }

  return (
    <div
      className={cn(
        "fixed z-20 flex flex-col items-end gap-cluster",
        spacingStyles.floatingPosition,
      )}
      onKeyDown={handleKeyDown}
    >
      {isOpen ? (
        <Card
          aria-labelledby={captureTitleId}
          className={cn(
            "w-[min(24rem,calc(100vw-(var(--spacing-page)*2)))]",
            spacingStyles.floatingPanel,
          )}
          id={capturePanelId}
          padding="md"
          role="dialog"
        >
          <form
            aria-busy={isSaving}
            className={spacingStyles.cardStack}
            onSubmit={handleSubmit}
          >
            <div className={spacingStyles.detailStack}>
              <label
                className={cn(
                  typographyStyles.cardTitle,
                  colorStyles.text.primary,
                )}
                htmlFor="inbox-thought"
                id={captureTitleId}
              >
                Capture a thought
              </label>
              <p
                className={cn(
                  typographyStyles.description,
                  colorStyles.text.muted,
                )}
              >
                Keep it brief. You can clarify it later.
              </p>
            </div>
            <input
              autoFocus
              className={cn(
                "w-full border p-card-compact",
                radiusStyles.control,
                typographyStyles.body,
                colorStyles.field,
                colorStyles.focusRing,
                motionStyles.field,
              )}
              id="inbox-thought"
              maxLength={200}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What is on your mind?"
              value={title}
            />
            <div className={cn(spacingStyles.cluster, "items-center")}>
              <Button disabled={!canCapture} type="submit">
                {isSaving ? "Saving…" : "Capture"}
              </Button>
              <Button
                onClick={closeCapture}
                type="button"
                variant="ghost"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Button
        aria-controls={capturePanelId}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close quick capture" : "Open quick capture"}
        className={cn(
          spacingStyles.floatingButton,
          radiusStyles.pill,
          "text-2xl",
        )}
        onClick={() => setIsOpen((current) => !current)}
        ref={triggerRef}
        type="button"
      >
        <span aria-hidden="true">{isOpen ? "×" : "+"}</span>
      </Button>
    </div>
  );
}

export { InboxCapture, type InboxCaptureProps };
