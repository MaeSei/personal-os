"use client";

import type { FormEvent } from "react";

import {
  fieldClassName,
  fieldGroupClassName,
  formGridClassName,
  labelClassName,
} from "@/components/forms/fieldStyles";
import { Button } from "@/components/ui/Button";
import { timeBlockTypes, type TimeBlockType } from "@/domain";
import type {
  PlannerTimeBlock,
  TimeBlockUpdateInput,
} from "@/features/contracts/PlannerFeature";
import { spacingStyles } from "@/theme/spacing";

type TimeBlockDetailsFormProps = {
  readonly block: PlannerTimeBlock;
  readonly disabled: boolean;
  readonly onUpdate: (input: TimeBlockUpdateInput) => void;
};

function TimeBlockDetailsForm({
  block,
  disabled,
  onUpdate,
}: TimeBlockDetailsFormProps) {
  function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;
    const form = new FormData(event.currentTarget);
    onUpdate({
      notes: String(form.get("notes") || "") || null,
      title: String(form.get("title")),
      type: String(form.get("type")) as TimeBlockType,
    });
  }

  return (
    <form className={spacingStyles.cardStack} onSubmit={update}>
      <div className={formGridClassName}>
        <div className={fieldGroupClassName}>
          <label className={labelClassName} htmlFor={`block-${block.id}-title`}>
            Name
          </label>
          <input className={fieldClassName} defaultValue={block.title} id={`block-${block.id}-title`} name="title" required />
        </div>
        <div className={fieldGroupClassName}>
          <label className={labelClassName} htmlFor={`block-${block.id}-type`}>
            Type
          </label>
          <select className={fieldClassName} defaultValue={block.type} id={`block-${block.id}-type`} name="type">
            {timeBlockTypes.map((type) => <option key={type}>{type}</option>)}
          </select>
        </div>
      </div>
      <div className={fieldGroupClassName}>
        <label className={labelClassName} htmlFor={`block-${block.id}-notes`}>
          Notes
        </label>
        <textarea className={fieldClassName} defaultValue={block.notes ?? ""} id={`block-${block.id}-notes`} name="notes" rows={2} />
      </div>
      <Button disabled={disabled} size="sm" type="submit">Save details</Button>
    </form>
  );
}

export { TimeBlockDetailsForm };
