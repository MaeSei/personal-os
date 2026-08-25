"use client";

import { useState, type FormEvent } from "react";

import { fieldClassName, labelClassName } from "@/components/forms/fieldStyles";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  MAX_FOCUS_CHECKLIST_ITEMS,
  MAX_FOCUS_CHECKLIST_TITLE,
  type FocusChecklistItem,
} from "@/domain";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type FocusChecklistProps = {
  readonly disabled: boolean;
  readonly items: readonly FocusChecklistItem[];
  readonly onAdd: (title: string) => Promise<void>;
  readonly onRemove: (id: string) => Promise<void>;
  readonly onToggle: (id: string, completed: boolean) => Promise<void>;
};

/** A lightweight execution checklist that does not create separate Tasks. */
function FocusChecklist(props: FocusChecklistProps) {
  const [title, setTitle] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = title.trim();
    if (!value) return;
    await props.onAdd(value);
    setTitle("");
  }

  return (
    <Card as="article" padding="lg">
      <div className={spacingStyles.cardStack}>
        <div>
          <h3 className={typographyStyles.cardTitle}>Checklist</h3>
          <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
            Small steps for this session only.
          </p>
        </div>
        {props.items.length > 0 ? (
          <ul className={cn("divide-y", colorStyles.itemList)}>
            {props.items.map((item) => (
              <li className="flex items-center gap-cluster py-card-compact" key={item.id}>
                <input
                  aria-label={`Mark ${item.title} ${item.completed ? "incomplete" : "complete"}`}
                  checked={item.completed}
                  className={cn("size-5 shrink-0 accent-accent", colorStyles.focusRing)}
                  disabled={props.disabled}
                  onChange={(event) => void props.onToggle(item.id, event.target.checked)}
                  type="checkbox"
                />
                <span className={cn("min-w-0 flex-1", item.completed && "text-ink-muted line-through")}>
                  {item.title}
                </span>
                <Button
                  aria-label={`Remove ${item.title}`}
                  disabled={props.disabled}
                  onClick={() => void props.onRemove(item.id)}
                  size="sm"
                  variant="ghost"
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
            No checklist steps yet. Add one only if it helps you continue.
          </p>
        )}
        <form className={spacingStyles.detailStack} onSubmit={(event) => void submit(event)}>
          <label className={labelClassName} htmlFor="focus-checklist-title">Add a step</label>
          <div className="flex flex-col gap-cluster sm:flex-row">
            <input
              className={cn(fieldClassName, "min-w-0 flex-1")}
              disabled={props.disabled || props.items.length >= MAX_FOCUS_CHECKLIST_ITEMS}
              id="focus-checklist-title"
              maxLength={MAX_FOCUS_CHECKLIST_TITLE}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What needs to happen next?"
              value={title}
            />
            <Button disabled={props.disabled || !title.trim()} type="submit">Add</Button>
          </div>
        </form>
      </div>
    </Card>
  );
}

export { FocusChecklist, type FocusChecklistProps };
