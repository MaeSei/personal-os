"use client";

import {
  useId,
  useRef,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { fieldClassName, labelClassName } from "@/components/forms/fieldStyles";
import { Button, getButtonClassName } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { spacingStyles } from "@/theme/spacing";

type DailyTaskGroupFormProps = {
  readonly disabled: boolean;
  readonly group: string | null;
  readonly groupNames: readonly string[];
  readonly onSave: (group: string | null) => void;
};

function DailyTaskGroupForm({
  disabled,
  group,
  groupNames,
  onSave,
}: DailyTaskGroupFormProps) {
  const inputId = useId();
  const listId = useId();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function close() {
    detailsRef.current?.removeAttribute("open");
    requestAnimationFrame(() =>
      detailsRef.current?.querySelector("summary")?.focus(),
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get("group") ?? "").trim();
    onSave(value || null);
    close();
  }

  return (
    <details
      onKeyDown={(event: KeyboardEvent<HTMLDetailsElement>) => {
        if (event.key === "Escape" && event.currentTarget.open) {
          event.preventDefault();
          close();
        }
      }}
      onToggle={(event) => {
        if (event.currentTarget.open) {
          requestAnimationFrame(() => inputRef.current?.focus());
        }
      }}
      ref={detailsRef}
    >
      <summary
        aria-disabled={disabled}
        className={cn(
          getButtonClassName({ size: "sm", variant: "ghost" }),
          "cursor-pointer list-none [&::-webkit-details-marker]:hidden",
        )}
        onClick={(event) => {
          if (disabled) event.preventDefault();
        }}
      >
        Group
      </summary>
      <form className={cn("pt-card-compact", spacingStyles.detailStack)} onSubmit={submit}>
        <label className={labelClassName} htmlFor={inputId}>Daily group</label>
        <input
          className={fieldClassName}
          defaultValue={group ?? ""}
          disabled={disabled}
          id={inputId}
          list={listId}
          maxLength={60}
          name="group"
          placeholder="e.g. Deep work"
          ref={inputRef}
        />
        <datalist id={listId}>
          {groupNames.map((name) => <option key={name} value={name} />)}
        </datalist>
        <div className={spacingStyles.cluster}>
          <Button disabled={disabled} size="sm" type="submit">Save group</Button>
          {group ? (
            <Button disabled={disabled} onClick={() => { onSave(null); close(); }} size="sm" variant="ghost">
              Clear
            </Button>
          ) : null}
        </div>
      </form>
    </details>
  );
}

export { DailyTaskGroupForm };
export type { DailyTaskGroupFormProps };
