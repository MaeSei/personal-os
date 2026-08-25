"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/Button";
import { spacingStyles } from "@/theme/spacing";

type TriageMode = "delete" | "project" | "task";

type TriageChoicesProps = {
  readonly disabled: boolean;
  readonly onModeChange: (mode: TriageMode) => void;
  readonly onReference: () => void;
  readonly onSomeday: () => void;
};

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName))
  );
}

function TriageChoices({
  disabled,
  onModeChange,
  onReference,
  onSomeday,
}: TriageChoicesProps) {
  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (disabled || isTyping(event.target)) return;

      const actions: Record<string, () => void> = {
        delete: () => onModeChange("delete"),
        p: () => onModeChange("project"),
        r: onReference,
        s: onSomeday,
        t: () => onModeChange("task"),
      };
      const action = actions[event.key.toLowerCase()];

      if (action) {
        event.preventDefault();
        action();
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [disabled, onModeChange, onReference, onSomeday]);

  const buttonClassName = "w-full justify-between";

  return (
    <div className={spacingStyles.cardStack}>
      <div className="grid gap-card-compact sm:grid-cols-2">
        <Button
          aria-keyshortcuts="t"
          className={buttonClassName}
          disabled={disabled}
          onClick={() => onModeChange("task")}
          variant="secondary"
        >
          Task <kbd aria-hidden="true">T</kbd>
        </Button>
        <Button
          aria-keyshortcuts="p"
          className={buttonClassName}
          disabled={disabled}
          onClick={() => onModeChange("project")}
          variant="secondary"
        >
          Project <kbd aria-hidden="true">P</kbd>
        </Button>
        <Button
          aria-keyshortcuts="s"
          className={buttonClassName}
          disabled={disabled}
          onClick={onSomeday}
          variant="secondary"
        >
          Someday <kbd aria-hidden="true">S</kbd>
        </Button>
        <Button
          aria-keyshortcuts="r"
          className={buttonClassName}
          disabled={disabled}
          onClick={onReference}
          variant="secondary"
        >
          Reference <kbd aria-hidden="true">R</kbd>
        </Button>
      </div>
      <Button
        aria-keyshortcuts="Delete"
        disabled={disabled}
        onClick={() => onModeChange("delete")}
        variant="ghost"
      >
        Delete
      </Button>
    </div>
  );
}

export { TriageChoices, type TriageMode };
