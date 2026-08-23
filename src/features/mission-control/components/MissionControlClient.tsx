"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { PageStatus } from "@/components/ui/PageStatus";
import {
  RuleBasedAttentionEngine,
  type AttentionEngine,
} from "@/domain";
import { MissionControl } from "@/features/mission-control/components/MissionControl";
import { loadMissionControl } from "@/features/mission-control/loadMissionControl";
import type { MissionControlData } from "@/features/mission-control/types";
import type { AreaRepository } from "@/repositories/AreaRepository";
import type { DailyReviewRepository } from "@/repositories/DailyReviewRepository";
import type { ItemRepository } from "@/repositories/ItemRepository";
import { LocalStorageRepository } from "@/repositories/LocalStorageRepository";
import type { ProjectRepository } from "@/repositories/ProjectRepository";

const repository = new LocalStorageRepository();
const areaRepository: AreaRepository = repository;
const itemRepository: ItemRepository = repository;
const projectRepository: ProjectRepository = repository;
const reviewRepository: DailyReviewRepository = repository;
const attentionEngine: AttentionEngine = new RuleBasedAttentionEngine();

/** Keeps browser-only persistence outside the reusable Mission Control UI. */
function MissionControlClient() {
  const [data, setData] = useState<MissionControlData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState(0);

  useEffect(() => {
    let isActive = true;

    loadMissionControl({
      areaRepository,
      attentionEngine,
      context: {
        locale: "en-GB",
        timeZone: "Europe/Stockholm",
        userName: "Maike",
      },
      itemRepository,
      projectRepository,
      reviewRepository,
    })
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
  }, [requestId]);

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
