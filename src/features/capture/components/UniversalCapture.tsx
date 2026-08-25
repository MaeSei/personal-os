"use client";

import { useEffect, useRef, useState } from "react";

import { CaptureNotice } from "@/features/capture/components/CaptureNotice";
import { DesktopCapture } from "@/features/capture/components/DesktopCapture";
import { MobileCapture } from "@/features/capture/components/MobileCapture";
import { publishInboxCaptured } from "@/features/capture/captureEvents";
import { useFeatures } from "@/features/FeatureProvider";
import { isEditableTarget } from "@/lib/dom";

type CaptureFeedback = {
  readonly message: string;
  readonly tone: "error" | "success";
};

/** Global controller for title-only Inbox capture on every product screen. */
function UniversalCapture() {
  const { inbox } = useFeatures();
  const [feedback, setFeedback] = useState<CaptureFeedback | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState("");
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (window.matchMedia("(min-width: 768px)").matches) {
      desktopInputRef.current?.focus();
    }

    function handleShortcut(event: globalThis.KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.key.toLowerCase() !== "c" ||
        isEditableTarget(event.target)
      ) {
        return;
      }

      event.preventDefault();
      setFeedback(null);
      if (window.matchMedia("(min-width: 768px)").matches) {
        desktopInputRef.current?.focus();
      } else {
        setIsMobileOpen(true);
      }
    }

    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (isMobileOpen) mobileInputRef.current?.focus();
  }, [isMobileOpen]);

  function closeMobile() {
    setIsMobileOpen(false);
    requestAnimationFrame(() => mobileTriggerRef.current?.focus());
  }

  function changeTitle(nextTitle: string) {
    setFeedback(null);
    setTitle(nextTitle);
  }

  async function capture(source: "desktop" | "mobile") {
    const capturedTitle = title.trim();
    if (!capturedTitle || isSaving) return;

    setFeedback(null);
    setIsSaving(true);
    try {
      const item = await inbox.capture(capturedTitle);
      setTitle("");
      setFeedback({
        message: `“${item.title}” captured to Inbox.`,
        tone: "success",
      });
      publishInboxCaptured({ itemId: item.id, title: item.title });
      if (source === "mobile") closeMobile();
      else desktopInputRef.current?.focus();
    } catch {
      setFeedback({
        message: "Atlas could not capture that thought. Please try again.",
        tone: "error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      {feedback ? <CaptureNotice {...feedback} /> : null}
      <DesktopCapture
        inputRef={desktopInputRef}
        isSaving={isSaving}
        onSubmit={() => capture("desktop")}
        onTitleChange={changeTitle}
        title={title}
      />
      <MobileCapture
        inputRef={mobileInputRef}
        isOpen={isMobileOpen}
        isSaving={isSaving}
        onClose={closeMobile}
        onOpen={() => {
          setFeedback(null);
          setIsMobileOpen(true);
        }}
        onSubmit={() => capture("mobile")}
        onTitleChange={changeTitle}
        title={title}
        triggerRef={mobileTriggerRef}
      />
    </>
  );
}

export { UniversalCapture };
