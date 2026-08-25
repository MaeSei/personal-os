"use client";

import type { KeyboardEvent, Ref } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CaptureForm } from "@/features/capture/components/CaptureForm";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { radiusStyles } from "@/theme/radius";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type MobileCaptureProps = {
  readonly inputRef: Ref<HTMLInputElement>;
  readonly isOpen: boolean;
  readonly isSaving: boolean;
  readonly onClose: () => void;
  readonly onOpen: () => void;
  readonly onSubmit: () => void;
  readonly onTitleChange: (title: string) => void;
  readonly title: string;
  readonly triggerRef: Ref<HTMLButtonElement>;
};

/** Thumb-reachable mobile entry that opens directly into the title field. */
function MobileCapture({
  inputRef,
  isOpen,
  isSaving,
  onClose,
  onOpen,
  onSubmit,
  onTitleChange,
  title,
  triggerRef,
}: MobileCaptureProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      onClose();
    }
  }

  return (
    <div
      className={cn(
        spacingStyles.mobileCapturePosition,
        spacingStyles.floatingPosition,
      )}
      onKeyDown={handleKeyDown}
    >
      {isOpen ? (
        <Card
          aria-labelledby="mobile-capture-title"
          className={cn(
            "w-[min(24rem,calc(100vw-(var(--spacing-page)*2)))]",
            spacingStyles.floatingPanel,
          )}
          id="mobile-capture-panel"
          padding="md"
          role="dialog"
        >
          <div className={spacingStyles.cardStack}>
            <div className={spacingStyles.detailStack}>
              <h2
                className={cn(
                  typographyStyles.cardTitle,
                  colorStyles.text.primary,
                )}
                id="mobile-capture-title"
              >
                Capture a thought
              </h2>
              <p
                className={cn(
                  typographyStyles.description,
                  colorStyles.text.muted,
                )}
                id="mobile-capture-description"
              >
                Straight to Inbox. Organise it later.
              </p>
            </div>
            <CaptureForm
              descriptionId="mobile-capture-description"
              inputId="mobile-universal-capture"
              inputRef={inputRef}
              isSaving={isSaving}
              layout="stacked"
              onCancel={onClose}
              onSubmit={onSubmit}
              onTitleChange={onTitleChange}
              title={title}
            />
          </div>
        </Card>
      ) : null}

      <Button
        aria-controls="mobile-capture-panel"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={isOpen ? "Close universal capture" : "Capture a thought"}
        className={cn(
          spacingStyles.floatingButton,
          radiusStyles.pill,
          "text-2xl",
        )}
        onClick={isOpen ? onClose : onOpen}
        ref={triggerRef}
        type="button"
      >
        <span aria-hidden="true">{isOpen ? "×" : "+"}</span>
      </Button>
    </div>
  );
}

export { MobileCapture, type MobileCaptureProps };
