"use client";

import type { Ref } from "react";

import { Card } from "@/components/ui/Card";
import { CaptureForm } from "@/features/capture/components/CaptureForm";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { radiusStyles } from "@/theme/radius";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type DesktopCaptureProps = {
  readonly inputRef: Ref<HTMLInputElement>;
  readonly isSaving: boolean;
  readonly onSubmit: () => void;
  readonly onTitleChange: (title: string) => void;
  readonly title: string;
};

/** Persistent desktop entry: type, press Enter, and keep working. */
function DesktopCapture(props: DesktopCaptureProps) {
  return (
    <div className={spacingStyles.desktopCapturePosition}>
      <Card
        aria-label="Universal capture"
        className="w-full max-w-3xl"
        padding="sm"
        role="region"
      >
        <p className="sr-only" id="desktop-capture-description">
          Creates an Inbox Item immediately. You can organise it later.
        </p>
        <div className="flex items-center gap-cluster">
          <div className="min-w-0 flex-1">
            <CaptureForm
              descriptionId="desktop-capture-description"
              inputId="desktop-universal-capture"
              {...props}
            />
          </div>
          <kbd
            aria-hidden="true"
            className={cn(
              "inline-flex border px-detail py-badge-y",
              radiusStyles.control,
              typographyStyles.metricLabel,
              colorStyles.chip,
            )}
          >
            C
          </kbd>
        </div>
      </Card>
    </div>
  );
}

export { DesktopCapture, type DesktopCaptureProps };
