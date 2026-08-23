import type { Metadata } from "next";

import { Inbox } from "@/features/inbox/components/Inbox";

export const metadata: Metadata = {
  description: "Capture uncategorized thoughts without breaking focus.",
  title: "Inbox | Atlas",
};

export default function InboxPage() {
  return <Inbox />;
}
