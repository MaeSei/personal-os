import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type CaptureNoticeProps = {
  readonly message: string;
  readonly tone: "error" | "success";
};

/** Visible and announced feedback that does not move the user off the page. */
function CaptureNotice({ message, tone }: CaptureNoticeProps) {
  return (
    <div className={spacingStyles.captureNoticePosition}>
      <Card
        aria-live={tone === "error" ? "assertive" : "polite"}
        className="max-w-[min(24rem,calc(100vw-(var(--spacing-page)*2)))]"
        padding="sm"
        role={tone === "error" ? "alert" : "status"}
        tone={tone === "error" ? "danger" : "accent"}
      >
        <p
          className={cn(
            typographyStyles.metricLabel,
            tone === "error"
              ? colorStyles.text.danger
              : colorStyles.text.accent,
          )}
        >
          {message}
        </p>
      </Card>
    </div>
  );
}

export { CaptureNotice, type CaptureNoticeProps };
