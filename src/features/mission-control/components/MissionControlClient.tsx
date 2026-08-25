"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { PageStatus } from "@/components/ui/PageStatus";
import { subscribeToInboxCaptured } from "@/features/capture/captureEvents";
import { useFeatures } from "@/features/FeatureProvider";
import { MissionControl } from "@/features/mission-control/components/MissionControl";
import { loadMissionControl } from "@/features/mission-control/loadMissionControl";
import type { MissionControlData } from "@/features/mission-control/types";

/** Keeps browser-only persistence outside the reusable Mission Control UI. */
function MissionControlClient() {
  const { missionControl } = useFeatures();
  const [data, setData] = useState<MissionControlData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState(0);

  useEffect(() => {
    let isActive = true;

    loadMissionControl({ missionControl })
      .then((missionControlData) => {
        if (isActive) {
          setData(missionControlData);
        }
      })
      .catch(() => {
        if (isActive) {
          setError("Atlas could not load this browser's data.");
        }
      });

    return () => {
      isActive = false;
    };
  }, [missionControl, requestId]);

  useEffect(
    () =>
      subscribeToInboxCaptured(() => {
        setError(null);
        setRequestId((current) => current + 1);
      }),
    [],
  );

  if (error) {
    return (
      <PageStatus
        action={
          <Button
            onClick={() => {
              setData(null);
              setError(null);
              setRequestId((current) => current + 1);
            }}
            variant="secondary"
          >
            Try again
          </Button>
        }
        description={error}
        title="Mission Control is unavailable"
        tone="danger"
      />
    );
  }

  if (!data) {
    return (
      <PageStatus
        description="Reading your review and deciding where attention belongs."
        title="Preparing Mission Control"
      />
    );
  }

  return <MissionControl data={data} />;
}

export { MissionControlClient };
