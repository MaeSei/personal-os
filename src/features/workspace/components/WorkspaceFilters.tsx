"use client";

import { useState, type FormEvent, type MouseEvent, type ReactNode } from "react";

import {
  fieldClassName,
  fieldGroupClassName,
  labelClassName,
} from "@/components/forms/fieldStyles";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { WorkspaceTaskFilters } from "@/domain";
import type { WorkspaceData } from "@/features/contracts/WorkspaceFeature";
import { countActiveWorkspaceFilters } from "@/features/workspace/presentation";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { radiusStyles } from "@/theme/radius";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type WorkspaceFiltersProps = {
  readonly disabled: boolean;
  readonly filters: WorkspaceTaskFilters;
  readonly isFiltering: boolean;
  readonly onChange: (filters: WorkspaceTaskFilters) => void;
  readonly options: WorkspaceData["filterOptions"];
};

function readOptional(form: FormData, name: string): string | null {
  return String(form.get(name) ?? "").trim() || null;
}

function WorkspaceFilters(props: WorkspaceFiltersProps) {
  const activeCount = countActiveWorkspaceFilters(props.filters);
  const [expanded, setExpanded] = useState(activeCount > 0);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const maxDuration = readOptional(form, "maxDuration");
    const maxEnergy = readOptional(form, "maxEnergy");
    props.onChange({
      areaId: readOptional(form, "areaId"),
      context: readOptional(form, "context"),
      maxDuration: maxDuration ? Number(maxDuration) : null,
      maxEnergy: maxEnergy
        ? (Number(maxEnergy) as WorkspaceTaskFilters["maxEnergy"])
        : null,
      projectId: readOptional(form, "projectId"),
      status: readOptional(form, "status") as WorkspaceTaskFilters["status"],
    });
  }

  function clear(event: MouseEvent<HTMLButtonElement>) {
    if (activeCount > 0) props.onChange({});
    else event.currentTarget.form?.reset();
  }

  return (
    <Card padding="none" tone="subtle">
      <details
        onToggle={(event) => setExpanded(event.currentTarget.open)}
        open={expanded}
      >
        <summary
          className={cn(
            "flex cursor-pointer list-none items-center justify-between gap-cluster [&::-webkit-details-marker]:hidden",
            radiusStyles.card,
            spacingStyles.cardPadding.sm,
            colorStyles.focusRing,
          )}
        >
          <span className={typographyStyles.cardTitle}>Filter Tasks</span>
          <Badge variant={props.isFiltering || activeCount > 0 ? "attention" : "neutral"}>
            {props.isFiltering
              ? "Applying…"
              : activeCount > 0
                ? `${activeCount} active`
                : "All"}
          </Badge>
        </summary>
        <form
          aria-busy={props.isFiltering}
          className={cn("border-t border-border", spacingStyles.cardPadding.sm, spacingStyles.cardStack)}
          onSubmit={submit}
        >
          <div className="grid gap-card sm:grid-cols-2">
            <FilterSelect defaultValue={props.filters.context} label="Context" name="context">
              {props.options.contexts.map((context) => <option key={context}>{context}</option>)}
            </FilterSelect>
            <FilterSelect defaultValue={props.filters.areaId} label="Area" name="areaId">
              {props.options.areas.map((area) => <option key={area.id} value={area.id}>{area.icon} {area.title}</option>)}
            </FilterSelect>
            <FilterSelect defaultValue={props.filters.projectId} label="Project" name="projectId">
              {props.options.projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
            </FilterSelect>
            <FilterSelect defaultValue={props.filters.maxEnergy} label="Energy available" name="maxEnergy">
              {props.options.energyLevels.map((energy) => <option key={energy} value={energy}>Up to {energy} of 5</option>)}
            </FilterSelect>
            <FilterSelect defaultValue={props.filters.maxDuration} label="Time available" name="maxDuration">
              {props.options.durations.map((duration) => <option key={duration} value={duration}>Up to {duration} min</option>)}
            </FilterSelect>
            <FilterSelect defaultValue={props.filters.status} label="Status" name="status">
              {props.options.statuses.map((status) => <option key={status}>{status}</option>)}
            </FilterSelect>
          </div>
          <div className={spacingStyles.cluster}>
            <Button disabled={props.disabled} size="sm" type="submit">
              {props.isFiltering ? "Applying…" : "Apply filters"}
            </Button>
            <Button disabled={props.disabled} onClick={clear} size="sm" variant="ghost">
              Clear
            </Button>
          </div>
          <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
            Unrestricted and Anywhere Tasks match every context. Time and energy are maximums.
          </p>
        </form>
      </details>
    </Card>
  );
}

type FilterSelectProps = {
  readonly children: ReactNode;
  readonly defaultValue: number | string | null | undefined;
  readonly label: string;
  readonly name: string;
};

function FilterSelect({ children, defaultValue, label, name }: FilterSelectProps) {
  return (
    <div className={fieldGroupClassName}>
      <label className={labelClassName} htmlFor={`workspace-${name}`}>{label}</label>
      <select className={fieldClassName} defaultValue={defaultValue ?? ""} id={`workspace-${name}`} name={name}>
        <option value="">All</option>
        {children}
      </select>
    </div>
  );
}

export { WorkspaceFilters, type WorkspaceFiltersProps };
