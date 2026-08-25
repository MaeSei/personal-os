"use client";

import { useState } from "react";

import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { CollapsiblePanel } from "@/components/ui/CollapsiblePanel";
import { useFeatures } from "@/features/FeatureProvider";
import { useCalendarConnection } from "@/features/calendar/hooks/useCalendarConnection";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type CalendarConnectionPanelProps = {
  readonly onCalendarChanged: () => Promise<unknown>;
};

const STATUS: Record<string, { label: string; variant: BadgeVariant }> = {
  error: { label: "Needs attention", variant: "warning" },
  idle: { label: "Connected", variant: "neutral" },
  success: { label: "Synced", variant: "success" },
  syncing: { label: "Syncing", variant: "attention" },
};

function CalendarConnectionPanel({ onCalendarChanged }: CalendarConnectionPanelProps) {
  const { calendar } = useFeatures();
  const connection = useCalendarConnection(calendar, onCalendarChanged);
  const data = connection.data;
  const status = STATUS[data?.status ?? "idle"] ?? STATUS.idle;
  return (
    <CollapsiblePanel
      defaultExpanded={Boolean(connection.error)}
      description={connection.error ?? `${data ? (data.connected ? status.label : "Not connected") : "Checking"} · Manage read-only calendar sync.`}
      title="Calendar connection"
    >
      <div className={spacingStyles.cardStack}>
        <div className="flex flex-wrap items-start justify-between gap-cluster">
          <div className={spacingStyles.detailStack}>
            <Badge variant={data?.connected ? status.variant : "neutral"}>
              {data?.connected ? status.label : "Not connected"}
            </Badge>
            <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
              {connection.error ?? data?.message ?? "Checking Calendar configuration…"}
            </p>
            {data?.email ? (
              <p className={typographyStyles.metricLabel}>{data.email}</p>
            ) : null}
          </div>
          {!data?.connected && data?.configured ? (
            <ButtonLink href="/api/calendar/google/connect">Sign in with Google</ButtonLink>
          ) : null}
        </div>

        {data?.connected ? (
          <CalendarSelectionForm
            data={data}
            disabled={connection.isSaving}
            key={`${data.email}-${data.lastSyncedAt?.toISOString() ?? "never"}`}
            onDisconnect={connection.disconnect}
            onRefresh={connection.refresh}
            onSave={connection.selectCalendars}
          />
        ) : null}
      </div>
    </CollapsiblePanel>
  );
}

type SelectionFormProps = {
  readonly data: NonNullable<ReturnType<typeof useCalendarConnection>["data"]>;
  readonly disabled: boolean;
  readonly onDisconnect: () => Promise<boolean>;
  readonly onRefresh: () => Promise<boolean>;
  readonly onSave: (ids: readonly string[]) => Promise<boolean>;
};

function CalendarSelectionForm({ data, disabled, onDisconnect, onRefresh, onSave }: SelectionFormProps) {
  const [selected, setSelected] = useState(
    () => data.calendars.filter((calendar) => calendar.selected).map(({ id }) => id),
  );
  return (
    <form className={spacingStyles.detailStack} onSubmit={(event) => {
      event.preventDefault();
      void onSave(selected);
    }}>
      <fieldset className={spacingStyles.detailStack} disabled={disabled}>
        <legend className={typographyStyles.label}>Calendars shown in Atlas</legend>
        {data.calendars.map((calendar) => (
          <label className="flex min-h-control-md items-center gap-cluster" key={calendar.id}>
            <input checked={selected.includes(calendar.id)} className={cn("size-4 accent-accent", colorStyles.focusRing)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, calendar.id] : current.filter((id) => id !== calendar.id))} type="checkbox" />
            <span className={typographyStyles.metricLabel}>{calendar.title}{calendar.primary ? " · Primary" : ""}</span>
          </label>
        ))}
      </fieldset>
      <div className={spacingStyles.cluster}>
        <Button disabled={disabled} size="sm" type="submit">Save calendars</Button>
        <Button disabled={disabled} onClick={() => void onRefresh()} size="sm" variant="secondary">Refresh now</Button>
        <Button disabled={disabled} onClick={() => void onDisconnect()} size="sm" variant="ghost">Disconnect</Button>
      </div>
      <p aria-live="polite" className={cn(typographyStyles.description, colorStyles.text.muted)}>
        {data.lastSyncedAt ? `Last synced ${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(data.lastSyncedAt)}.` : "No completed sync yet."}
      </p>
    </form>
  );
}

export { CalendarConnectionPanel };
