"use client";

import Link from "next/link";
import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { usePathname } from "next/navigation";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";

import { useLoading } from "./loading-context";
import { LOADER_DELAY_MS } from "./loading-context";

type ButtonLoaderProps = {
  loading?: boolean;
  label: string;
  loadingLabel?: string;
  className?: string;
};

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ButtonLoader({
  className,
  label,
  loading,
  loadingLabel
}: ButtonLoaderProps) {
  return (
    <span className={["inline-flex items-center justify-center gap-2", className].filter(Boolean).join(" ")}>
      {loading ? <Spinner /> : null}
      <span>{loading ? loadingLabel || label : label}</span>
    </span>
  );
}

type FormSubmitButtonProps = Omit<ComponentProps<"button">, "children"> & {
  children: ReactNode;
  loadingLabel?: string;
};

export function FormSubmitButton({
  children,
  className,
  disabled,
  loadingLabel,
  ...props
}: FormSubmitButtonProps) {
  const { pending } = useFormStatus();
  const label = typeof children === "string" ? children : "Working";

  return (
    <button
      {...props}
      className={className}
      disabled={disabled || pending}
      type={props.type ?? "submit"}
    >
      {pending ? <ButtonLoader label={label} loading {...(loadingLabel ? { loadingLabel } : {})} /> : children}
    </button>
  );
}

export function PageLoader({ label = "Loading workspace" }: { label?: string }) {
  return (
    <main className="space-y-6 lg:space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-3">
          <div className="h-3 w-32 rounded-full bg-slate-200 loading-shimmer" />
          <div className="h-10 w-64 rounded-2xl bg-slate-200 loading-shimmer" />
        </div>
        <div className="hidden h-8 w-24 rounded-full bg-white shadow-sm loading-shimmer sm:block" />
      </div>
      <div className="sr-only" role="status">
        {label}
      </div>
      <SkeletonCard />
      <SkeletonTable rows={5} />
    </main>
  );
}

export function LoadingOverlay({
  label = "Working",
  visible
}: {
  label?: string;
  visible?: boolean;
}) {
  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/8 backdrop-blur-[1px]">
      <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.5)]">
        <Spinner className="h-4 w-4 text-cyan-800" />
        {label}
      </div>
    </div>
  );
}

export function RouteLoader() {
  const { routeLoading } = useLoading();

  return (
    <div
      aria-hidden={!routeLoading}
      className={[
        "fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden bg-transparent transition-opacity duration-200",
        routeLoading ? "opacity-100" : "opacity-0"
      ].join(" ")}
    >
      <div className="h-full w-full origin-left bg-cyan-700 route-progress" />
    </div>
  );
}

export function BackgroundOperationIndicator() {
  const { operations } = useLoading();
  const fetching = useIsFetching();
  const mutating = useIsMutating();
  const count = operations.filter((operation) => operation.id !== "route-transition").length + fetching + mutating;
  const visible = useDelayedVisible(count > 0);

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[70] hidden items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-600 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.45)] backdrop-blur sm:flex">
      <span className="h-2 w-2 rounded-full bg-cyan-700 loading-pulse" />
      Syncing
    </div>
  );
}

function useDelayedVisible(active: boolean) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      const timer = window.setTimeout(() => setVisible(false), 0);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      setVisible(true);
    }, LOADER_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [active]);

  return visible;
}

export function LoadingShell({ children }: { children: ReactNode }) {
  const { globalLoading } = useLoading();

  return (
    <>
      <RouteLoader />
      <LoadingOverlay label="Loading" visible={globalLoading} />
      <BackgroundOperationIndicator />
      {children}
    </>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <section className={["rounded-2xl border border-slate-200 bg-white p-5 shadow-sm", className].filter(Boolean).join(" ")}>
      <div className="space-y-4">
        <div className="h-4 w-1/3 rounded-full bg-slate-200 loading-shimmer" />
        <div className="h-7 w-2/3 rounded-xl bg-slate-200 loading-shimmer" />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="h-20 rounded-2xl bg-slate-100 loading-shimmer" />
          <div className="h-20 rounded-2xl bg-slate-100 loading-shimmer" />
          <div className="h-20 rounded-2xl bg-slate-100 loading-shimmer" />
        </div>
      </div>
    </section>
  );
}

export function SkeletonTable({ rows = 6 }: { rows?: number }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-4 gap-4 border-b border-slate-100 bg-slate-50 px-5 py-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="h-3 rounded-full bg-slate-200 loading-shimmer" key={index} />
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, row) => (
          <div className="grid grid-cols-4 gap-4 px-5 py-4" key={row}>
            {Array.from({ length: 4 }).map((__, column) => (
              <div className="h-4 rounded-full bg-slate-100 loading-shimmer" key={column} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

export function LoadingLink({
  href,
  onClick,
  ...props
}: ComponentProps<typeof Link>) {
  const pathname = usePathname();
  const { startRouteTransition } = useLoading();
  const hrefString = typeof href === "string" ? href : href.toString();

  return (
    <Link
      {...props}
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (
          !event.defaultPrevented &&
          !hrefString.startsWith("#") &&
          !hrefString.startsWith("http") &&
          hrefString !== pathname
        ) {
          startRouteTransition("Loading page");
        }
      }}
    />
  );
}
