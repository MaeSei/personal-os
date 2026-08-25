"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  CalendarConnectionData,
  CalendarFeature,
} from "@/features/contracts/CalendarFeature";

const BACKGROUND_REFRESH_MS = 5 * 60 * 1_000;

function useCalendarConnection(
  calendar: CalendarFeature,
  onCalendarChanged: () => Promise<unknown>,
) {
  const [data, setData] = useState<CalendarConnectionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;
    calendar.getConnection()
      .then((result) => { if (active) setData(result); })
      .catch(() => {
        if (active) setError("Atlas could not load the Calendar connection.");
      });
    return () => { active = false; };
  }, [calendar]);

  useEffect(() => {
    if (!data?.connected) return;
    const interval = window.setInterval(() => {
      calendar.refresh().then(async (result) => {
        setData(result);
        await onCalendarChanged();
      }).catch(() => setError("Background Calendar refresh failed."));
    }, BACKGROUND_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [calendar, data?.connected, onCalendarChanged]);

  const run = useCallback(async (
    action: () => Promise<CalendarConnectionData>,
  ) => {
    setError(null);
    setIsSaving(true);
    try {
      const result = await action();
      setData(result);
      await onCalendarChanged();
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Calendar update failed.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [onCalendarChanged]);

  return {
    data,
    disconnect: () => run(() => calendar.disconnect()),
    error,
    isSaving,
    refresh: () => run(() => calendar.refresh()),
    selectCalendars: (ids: readonly string[]) =>
      run(() => calendar.selectCalendars(ids)),
  };
}

export { useCalendarConnection };
