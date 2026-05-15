import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

import { QueryProvider } from "@/shared/providers/query-provider";
import { ServiceWorkerRegistration } from "@/shared/pwa/service-worker-registration";

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
          {children}
          <ServiceWorkerRegistration />
        </QueryProvider>
      </body>
    </html>
  );
}
