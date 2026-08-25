"use client";

import { useState, type FormEvent } from "react";

import { fieldClassName, fieldGroupClassName, labelClassName } from "@/components/forms/fieldStyles";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import { isProjectNotePinned, type ProjectNote } from "@/domain";
import { formatActivity } from "@/features/projects/presentation";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type ProjectNotesProps = {
  readonly disabled: boolean;
  readonly notes: readonly ProjectNote[];
  readonly onCreate: (body: string, pinned: boolean) => Promise<boolean>;
  readonly onDelete: (noteId: string) => Promise<boolean>;
  readonly onSetPinned: (noteId: string, pinned: boolean) => Promise<boolean>;
};

function ProjectNotes(props: ProjectNotesProps) {
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const saved = await props.onCreate(
      String(form.get("body") ?? ""),
      form.get("pinned") === "on",
    );
    if (saved) setAdding(false);
  }

  return (
    <Section
      action={<Button disabled={props.disabled} onClick={() => setAdding(true)} size="sm">Add Note</Button>}
      description="Durable context and decisions that help you resume."
      id="project-notes"
      title="Notes"
    >
      {adding ? (
        <Card tone="subtle">
          <form className={spacingStyles.cardStack} onSubmit={create}>
            <div className={fieldGroupClassName}>
              <label className={labelClassName} htmlFor="project-note-body">Note</label>
              <textarea
                autoFocus
                className={fieldClassName}
                id="project-note-body"
                maxLength={2000}
                name="body"
                required
                rows={4}
              />
            </div>
            <label className={cn("flex items-center gap-cluster", typographyStyles.metricLabel)}>
              <input className="size-4 accent-accent" name="pinned" type="checkbox" /> Pin this context
            </label>
            <div className={spacingStyles.cluster}>
              <Button disabled={props.disabled} type="submit">{props.disabled ? "Saving…" : "Add Note"}</Button>
              <Button disabled={props.disabled} onClick={() => setAdding(false)} variant="ghost">Cancel</Button>
            </div>
          </form>
        </Card>
      ) : null}
      {props.notes.length === 0 ? (
        <EmptyState
          description="Add context when it will make the Project easier to resume."
          title="No Project notes"
        />
      ) : (
        <div className={spacingStyles.cardGrid}>
          {props.notes.map((note) => {
            const pinned = isProjectNotePinned(note);
            return (
              <Card as="article" key={note.id} tone={pinned ? "accent" : "default"}>
                <div className={spacingStyles.cardStack}>
                  <header className="flex items-center justify-between gap-cluster">
                    <time
                      className={cn(typographyStyles.description, colorStyles.text.muted)}
                      dateTime={note.updatedAt.toISOString()}
                    >
                      {formatActivity(note.updatedAt)}
                    </time>
                    {pinned ? <Badge variant="attention">Pinned</Badge> : null}
                  </header>
                  <p className={cn(typographyStyles.body, "whitespace-pre-wrap")}>{note.description}</p>
                  <div className={spacingStyles.cluster}>
                    <Button disabled={props.disabled} onClick={() => void props.onSetPinned(note.id, !pinned)} size="sm" variant="secondary">
                      {pinned ? "Unpin" : "Pin"}
                    </Button>
                    {confirmDelete === note.id ? (
                      <>
                        <Button disabled={props.disabled} onClick={() => void props.onDelete(note.id)} size="sm" variant="danger">Delete Note</Button>
                        <Button onClick={() => setConfirmDelete(null)} size="sm" variant="ghost">Keep</Button>
                      </>
                    ) : (
                      <Button disabled={props.disabled} onClick={() => setConfirmDelete(note.id)} size="sm" variant="ghost">Delete</Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Section>
  );
}

export { ProjectNotes };
