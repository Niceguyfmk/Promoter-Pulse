"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { usePathname, useSearchParams } from "next/navigation";

type LoadingKind = "global" | "background" | "mutation" | "upload";

type LoadingOperation = {
  id: string;
  label: string;
  kind: LoadingKind;
  startedAt: number;
};

type LoadingOptions = {
  id?: string;
  label?: string;
  kind?: LoadingKind;
};

type LoadingContextValue = {
  backgroundCount: number;
  beginOperation: (options?: LoadingOptions) => () => void;
  completeRouteTransition: () => void;
  globalLoading: boolean;
  operations: LoadingOperation[];
  routeLoading: boolean;
  startRouteTransition: (label?: string) => void;
  trackOperation: <T>(operation: Promise<T>, options?: LoadingOptions) => Promise<T>;
};

const LoadingContext = createContext<LoadingContextValue | null>(null);
const LOADER_DELAY_MS = 150;

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [operations, setOperations] = useState<LoadingOperation[]>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeVisible, setRouteVisible] = useState(false);
  const routeDelayRef = useRef<number | null>(null);
  const routeFallbackRef = useRef<number | null>(null);

  const clearRouteTimers = useCallback(() => {
    if (routeDelayRef.current) {
      window.clearTimeout(routeDelayRef.current);
      routeDelayRef.current = null;
    }
    if (routeFallbackRef.current) {
      window.clearTimeout(routeFallbackRef.current);
      routeFallbackRef.current = null;
    }
  }, []);

  const completeRouteTransition = useCallback(() => {
    clearRouteTimers();
    setRouteLoading(false);
    setRouteVisible(false);
  }, [clearRouteTimers]);

  const handleRouteComplete = useCallback(() => {
    completeRouteTransition();
    setOperations((current) => current.filter((operation) => operation.id !== "route-transition"));
  }, [completeRouteTransition]);

  const startRouteTransition = useCallback(
    (label = "Loading page") => {
      clearRouteTimers();
      setRouteLoading(true);
      routeDelayRef.current = window.setTimeout(() => {
        setRouteVisible(true);
      }, LOADER_DELAY_MS);
      routeFallbackRef.current = window.setTimeout(() => {
        completeRouteTransition();
      }, 8_000);

      setOperations((current) => [
        ...current.filter((operation) => operation.id !== "route-transition"),
        {
          id: "route-transition",
          label,
          kind: "background",
          startedAt: Date.now()
        }
      ]);
    },
    [clearRouteTimers, completeRouteTransition]
  );

  useEffect(() => () => clearRouteTimers(), [clearRouteTimers]);

  const beginOperation = useCallback((options: LoadingOptions = {}) => {
    const id = options.id ?? crypto.randomUUID();
    const operation: LoadingOperation = {
      id,
      label: options.label ?? "Working",
      kind: options.kind ?? "background",
      startedAt: Date.now()
    };

    setOperations((current) => [...current.filter((item) => item.id !== id), operation]);

    return () => {
      setOperations((current) => current.filter((item) => item.id !== id));
    };
  }, []);

  const trackOperation = useCallback(
    async <T,>(operation: Promise<T>, options?: LoadingOptions) => {
      const end = beginOperation(options);
      try {
        return await operation;
      } finally {
        end();
      }
    },
    [beginOperation]
  );

  const value = useMemo<LoadingContextValue>(() => {
    const globalLoading = routeVisible || operations.some((operation) => operation.kind === "global");
    const backgroundCount = operations.filter((operation) => operation.kind !== "global").length;

    return {
      backgroundCount,
      beginOperation,
      completeRouteTransition,
      globalLoading,
      operations,
      routeLoading: routeLoading && routeVisible,
      startRouteTransition,
      trackOperation
    };
  }, [
    beginOperation,
    completeRouteTransition,
    operations,
    routeLoading,
    routeVisible,
    startRouteTransition,
    trackOperation
  ]);

  return (
    <LoadingContext.Provider value={value}>
      <Suspense fallback={null}>
        <RouteTransitionCompletion onComplete={handleRouteComplete} />
      </Suspense>
      {children}
    </LoadingContext.Provider>
  );
}

function RouteTransitionCompletion({ onComplete }: { onComplete: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    window.setTimeout(onComplete, 0);
  }, [pathname, searchParams, onComplete]);

  return null;
}

export function useLoading() {
  const context = useContext(LoadingContext);

  if (!context) {
    throw new Error("useLoading must be used within LoadingProvider");
  }

  return context;
}

export { LOADER_DELAY_MS };
