"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getFocusElapsedSeconds, type FocusSession } from "@/domain";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type FocusTimerProps = {
  readonly disabled: boolean;
  readonly onPause: () => void;
  readonly onResume: () => void;
  readonly session: FocusSession;
};

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

/** A generic elapsed timer with no prescribed interval or work method. */
function FocusTimer({ disabled, onPause, onResume, session }: FocusTimerProps) {
  const [now, setNow] = useState(() => new Date());
  const running = session.startedAt !== null;

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(interval);
  }, [running, session.startedAt]);

  const elapsed = getFocusElapsedSeconds(session, now);

  return (
    <Card as="article" padding="lg">
      <div className={spacingStyles.cardStack}>
        <div className="flex items-start justify-between gap-cluster">
          <div>
            <h3 className={typographyStyles.cardTitle}>Timer</h3>
            <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
              Elapsed focus time
            </p>
          </div>
          <Badge variant={running ? "success" : "neutral"}>
            {running ? "Running" : "Paused"}
          </Badge>
        </div>
        <time
          aria-label={`${elapsed} seconds elapsed`}
          className={cn(typographyStyles.metric, colorStyles.text.primary)}
          dateTime={`PT${elapsed}S`}
        >
          {formatDuration(elapsed)}
        </time>
        <div className={spacingStyles.cluster}>
          <Button
            disabled={disabled}
            onClick={running ? onPause : onResume}
            size="lg"
          >
            {running ? "Pause" : elapsed > 0 ? "Resume" : "Start"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export { FocusTimer, formatDuration, type FocusTimerProps };
