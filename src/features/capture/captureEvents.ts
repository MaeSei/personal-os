import type { ItemId } from "@/domain";

const inboxCapturedEvent = "atlas:inbox-captured";

type InboxCapturedDetail = {
  readonly itemId: ItemId;
  readonly title: string;
};

type InboxCapturedListener = (detail: InboxCapturedDetail) => void;

/** Notifies mounted views after the Inbox capture capability succeeds. */
function publishInboxCaptured(detail: InboxCapturedDetail): void {
  window.dispatchEvent(
    new CustomEvent<InboxCapturedDetail>(inboxCapturedEvent, { detail }),
  );
}

/** Keeps same-tab projections current without exposing storage to the UI. */
function subscribeToInboxCaptured(listener: InboxCapturedListener): () => void {
  function handleCapture(event: Event) {
    listener((event as CustomEvent<InboxCapturedDetail>).detail);
  }

  window.addEventListener(inboxCapturedEvent, handleCapture);
  return () => window.removeEventListener(inboxCapturedEvent, handleCapture);
}

export { publishInboxCaptured, subscribeToInboxCaptured };
export type { InboxCapturedDetail, InboxCapturedListener };
