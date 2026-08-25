import type { Metadata } from "next";

import { ApplicationContainerProvider } from "@/application/ApplicationContainerProvider";
import { UniversalCaptureShell } from "@/features/capture/components/UniversalCaptureShell";
import { OnboardingGate } from "@/features/onboarding/components/OnboardingGate";

import "./globals.css";

export const metadata: Metadata = {
  title: "Atlas",
  description: "A calm operating system for focused work.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <ApplicationContainerProvider>
          <OnboardingGate>
            <UniversalCaptureShell>{children}</UniversalCaptureShell>
          </OnboardingGate>
        </ApplicationContainerProvider>
      </body>
    </html>
  );
}
