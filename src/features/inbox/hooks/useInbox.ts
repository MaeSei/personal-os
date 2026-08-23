"use client";

import { useEffect, useState } from "react";

import type { Item } from "@/domain";
import type { InboxRepository } from "@/repositories/InboxRepository";

/** Coordinates local Inbox state without exposing its storage mechanism. */
function useInbox(repository: InboxRepository) {
  const [announcement, setAnnouncement] = useState("");
  const [items, setItems] = useState<readonly Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    repository
      .getInbox()
      .then((storedItems) => {
        if (isActive) {
          setItems(storedItems);
        }
      })
      .catch(() => {
        if (isActive) {
          setError("Atlas could not read this browser's Inbox.");
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [repository]);

  async function capture(title: string): Promise<boolean> {
    setAnnouncement("");
    setError(null);

    try {
      const capturedItem = await repository.capture(title);
      setItems(await repository.getInbox());
      setAnnouncement(`${capturedItem.title} was added to your Inbox.`);
      return true;
    } catch {
      setError("Atlas could not save that thought. Please try again.");
      return false;
    }
  }

  return { announcement, capture, error, isLoading, items };
}

export { useInbox };
