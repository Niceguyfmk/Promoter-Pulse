import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "survey-core/survey-core.css";
import "./globals.css";

import { QueryProvider } from "@/shared/providers/query-provider";
import { ServiceWorkerRegistration } from "@/shared/pwa/service-worker-registration";
import { DisableNumberScroll } from "@/shared/components/DisableNumberScroll";
import { LoadingProvider, LoadingShell } from "@/shared/loading";

export const metadata: Metadata = {
  title: "Promoter Pulse",
  description: "Mobile field promoter operations for retail teams.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Promoter Pulse",
    statusBarStyle: "default"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#155e75"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <LoadingProvider>
            <LoadingShell>
              {children}
              <ServiceWorkerRegistration />
              <DisableNumberScroll />
            </LoadingShell>
          </LoadingProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
