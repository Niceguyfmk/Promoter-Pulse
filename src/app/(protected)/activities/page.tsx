import {
  createAttendanceService,
  type ActivitySummaryPeriod,
  type AttendanceShift,
  type CoverageStore
} from "@/features/attendance/server/attendance-service";
import { ShiftCard } from "@/features/attendance/components/ShiftCard";
import { StartWorkdayCard } from "@/features/attendance/components/StartWorkdayCard";
import { createAuthService } from "@/features/auth/server/app-auth-service";
import { ActivityPeriodDropdown } from "./ActivityPeriodDropdown";

export default async function ActivitiesPage({
  searchParams
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const [session, params] = await Promise.all([createAuthService().requireSession(), searchParams]);
  const period = parsePeriod(params.period);
  const isPromoter =
    session.roles.includes("promoter") &&
    !session.roles.some((role) => role === "admin" || role === "manager");
  const attendanceService = createAttendanceService();
  const [shifts, todaySummary, coverageStores] = await Promise.all([
    attendanceService.getUpcomingShifts(),
    attendanceService.getTodayActivitySummary(period),
    attendanceService.getCoverageStores()
  ]);
  const activeWorkflow = isPromoter ? await attendanceService.getActiveWorkflowVisit() : null;

  const totalShifts = shifts?.length ?? 0;

  if (isPromoter) {
    return (
      <main className="space-y-6 lg:space-y-8">
        <StartWorkdayCard activeWorkflow={activeWorkflow} />

        <PeriodFilter currentPeriod={period} />

        <section className="grid grid-cols-3 gap-2 sm:gap-4">
          <MetricCard label="Assigned visits" tone="info" value={todaySummary.visits} />
          <MetricCard label="In progress" tone="warning" value={todaySummary.activeReps} />
          <MetricCard label="Completed" tone="success" value={todaySummary.completed} />
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight text-text">Today&apos;s visits</h2>
            <span className="rounded-full border border-border bg-card px-3 py-1 text-sm font-medium text-text-2">
              {totalShifts} scheduled
            </span>
          </div>
          <div className="space-y-4">
            {shifts && shifts.length > 0 ? (
              shifts.map((shift) => <ShiftCard key={shift.id} shift={shift as AttendanceShift} />)
            ) : (
              <EmptyState title="No visits scheduled" />
            )}
          </div>
        </section>

        {/* Reserves space so the fixed StartWorkdayCard doesn't cover the last visit on mobile. */}
        <div className="h-24 lg:hidden" aria-hidden="true" />
      </main>
    );
  }

  return (
    <main className="space-y-6 lg:space-y-8">
      <section className="space-y-3">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-text sm:text-5xl">
              Activity Feed
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-2 sm:text-base">
              Review your assigned store visits, attendance status, and shift actions from one field
              dashboard.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <ActivityPeriodDropdown currentPeriod={period} />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_60px_-40px_rgba(15,23,42,0.25)]">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1.2fr)_360px]">
          <CoverageMap stores={coverageStores} />

          <aside className="border-t border-border bg-surface/70 p-5 sm:p-6 xl:border-l xl:border-t-0">
            <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
              <MetricCard label="Active reps" value={todaySummary.activeReps} />
              <MetricCard label="Visits" value={todaySummary.visits} />
              <MetricCard label="Completed" value={todaySummary.completed} />
            </div>
          </aside>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight text-text">Assigned shifts</h2>
            <span className="rounded-full border border-border bg-card px-3 py-1 text-sm font-medium text-text-2">
              {totalShifts} scheduled
            </span>
          </div>
          <div className="space-y-4">
            {shifts && shifts.length > 0 ? (
              shifts.map((shift) => <ShiftCard key={shift.id} shift={shift as AttendanceShift} />)
            ) : (
              <EmptyState title="No shifts scheduled" />
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-text-2">
              Today&apos;s focus
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-text">
              Stay on schedule and capture attendance cleanly
            </h3>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-text-2">
              <li className="flex gap-3">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-garnet" />
                Enable location access before check-in so your visit is recorded correctly.
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-border" />
                Keep your phone online after attendance actions until sync completes.
              </li>
            </ul>
          </section>

          <section className="rounded-2xl border border-ink-3 bg-ink p-6 text-white shadow-sm">
            <p className="text-sm uppercase tracking-[0.18em] text-brass">Sync status</p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight">Online session active</h3>
          </section>
        </aside>
      </section>
    </main>
  );
}

const periodLabels: Record<ActivitySummaryPeriod, string> = {
  day: "Today",
  week: "This week",
  month: "This month"
};

function parsePeriod(value: string | undefined): ActivitySummaryPeriod {
  return value === "week" || value === "month" ? value : "day";
}

function PeriodFilter({ currentPeriod }: { currentPeriod: ActivitySummaryPeriod }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(["day", "week", "month"] as const).map((period) => (
        <a
          className={[
            "inline-flex h-10 items-center rounded-lg px-4 text-sm font-bold transition",
            currentPeriod === period
              ? "bg-ink text-white"
              : "border border-border bg-card text-text-2 hover:bg-surface"
          ].join(" ")}
          href={`/activities?period=${period}`}
          key={period}
        >
          {periodLabels[period]}
        </a>
      ))}
    </div>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/75 px-8 py-16 text-center shadow-sm">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-xl bg-surface text-text-2">
        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            d="M8 2v3m8-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2 2V6a1 1 0 0 1 1-1Z"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      </div>
      <h3 className="mt-5 text-xl font-semibold text-text">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-text-2">
        Contact your manager for updates or assignments.
      </p>
    </div>
  );
}

function CoverageMap({ stores }: { stores: CoverageStore[] }) {
  const plottedStores = stores.filter((store) => store.latitude != null && store.longitude != null);
  const map = getTileMap(plottedStores);
  const liveCount = plottedStores.filter((store) => store.isLive).length;

  return (
    <div className="relative min-h-[360px] overflow-hidden bg-slate-200">
      {map ? (
        <div className="absolute inset-0">
          {map.tiles.map((tile) => (
            <div
              aria-hidden="true"
              className="absolute h-64 w-64 bg-cover bg-center"
              key={`${tile.x}-${tile.y}`}
              style={{
                backgroundImage: `url(https://tile.openstreetmap.org/${map.zoom}/${tile.x}/${tile.y}.png)`,
                left: `calc(50% + ${tile.left}px)`,
                top: `calc(50% + ${tile.top}px)`
              }}
            />
          ))}
          <div className="absolute inset-0 bg-white/5" />
          <a
            className="absolute bottom-2 right-3 rounded bg-white/85 px-2 py-1 text-[10px] font-medium text-slate-600"
            href="https://www.openstreetmap.org/copyright"
            rel="noopener noreferrer"
            target="_blank"
          >
            © OpenStreetMap
          </a>
        </div>
      ) : null}
      <div className="absolute left-5 top-5 z-10 rounded-xl bg-card/92 px-4 py-3 shadow-sm backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-garnet">
          Coverage overview
        </p>
        <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-text-2">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-success" />
            Live {liveCount}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-danger" />
            No live rep {Math.max(plottedStores.length - liveCount, 0)}
          </span>
        </div>
      </div>

      {plottedStores.length > 0 && map ? (
        plottedStores.map((store) => {
          const position = getTilePinPosition(store, map);

          return (
            <div
              className="group absolute z-20 -translate-x-1/2 -translate-y-full"
              key={store.id}
              style={{
                left: `calc(50% + ${position.x}px)`,
                top: `calc(50% + ${position.y}px)`
              }}
            >
              <div
                className={[
                  "grid h-10 w-10 place-items-center rounded-full border-4 border-white shadow-lg ring-4",
                  store.isLive ? "bg-success ring-success/20" : "bg-danger ring-danger/20"
                ].join(" ")}
                title={`${store.name}: ${store.isLive ? "Live promoter" : "No live promoter"}`}
              >
                <span className="h-3 w-3 rounded-full bg-white" />
              </div>
              <div className="pointer-events-none absolute left-1/2 top-12 hidden w-56 -translate-x-1/2 rounded-lg bg-ink px-3 py-2 text-xs text-white shadow-xl group-hover:block">
                <p className="font-bold">{store.name}</p>
                <p className="mt-1 text-white/70">{store.address || "No address"}</p>
                <p className="mt-1 font-semibold">
                  {store.isLive ? "Live promoter active" : "No live promoter"}
                </p>
              </div>
            </div>
          );
        })
      ) : (
        <div className="absolute inset-x-6 bottom-6 z-10 rounded-xl bg-card/92 p-5 shadow-sm backdrop-blur">
          <h2 className="text-xl font-semibold tracking-tight text-text">No store GPS pins yet</h2>
          <p className="mt-2 text-sm leading-6 text-text-2">
            Add latitude and longitude to store records to populate the coverage map.
          </p>
        </div>
      )}
    </div>
  );
}

type TileMap = {
  zoom: number;
  originTileX: number;
  originTileY: number;
  centerPixelX: number;
  centerPixelY: number;
  tiles: Array<{ x: number; y: number; left: number; top: number }>;
};

function getTileMap(stores: CoverageStore[]): TileMap | null {
  if (!stores.length) {
    return null;
  }

  const centerLatitude =
    stores.reduce((total, store) => total + Number(store.latitude), 0) / stores.length;
  const centerLongitude =
    stores.reduce((total, store) => total + Number(store.longitude), 0) / stores.length;
  const zoom = 14;
  const center = latLngToWorldPixel(centerLatitude, centerLongitude, zoom);
  const originTileX = Math.floor(center.x / 256);
  const originTileY = Math.floor(center.y / 256);
  const tiles: TileMap["tiles"] = [];

  for (let y = -2; y <= 2; y += 1) {
    for (let x = -3; x <= 3; x += 1) {
      const tileX = originTileX + x;
      const tileY = originTileY + y;
      tiles.push({
        x: tileX,
        y: tileY,
        left: tileX * 256 - center.x,
        top: tileY * 256 - center.y
      });
    }
  }

  return {
    zoom,
    originTileX,
    originTileY,
    centerPixelX: center.x,
    centerPixelY: center.y,
    tiles
  };
}

function getTilePinPosition(store: CoverageStore, map: TileMap) {
  const pixel = latLngToWorldPixel(Number(store.latitude), Number(store.longitude), map.zoom);

  return {
    x: pixel.x - map.centerPixelX,
    y: pixel.y - map.centerPixelY
  };
}

function latLngToWorldPixel(latitude: number, longitude: number, zoom: number) {
  const sinLatitude = Math.sin((latitude * Math.PI) / 180);
  const scale = 256 * 2 ** zoom;

  return {
    x: ((longitude + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)) * scale
  };
}

type MetricTone = "neutral" | "info" | "warning" | "success";

const metricToneStyles: Record<MetricTone, { section: string; icon: string }> = {
  neutral: { section: "border-border bg-card", icon: "bg-surface text-text-2" },
  info: { section: "border-info/15 bg-info-tint", icon: "bg-card/70 text-info" },
  warning: { section: "border-warning/15 bg-warning-tint", icon: "bg-card/70 text-warning" },
  success: { section: "border-success/15 bg-success-tint", icon: "bg-card/70 text-success" }
};

function MetricCard({
  label,
  value,
  tone = "neutral"
}: {
  label: string;
  value: number;
  tone?: MetricTone;
}) {
  const toneStyle = metricToneStyles[tone];

  return (
    <section className={`rounded-2xl border p-3 shadow-sm sm:p-6 ${toneStyle.section}`}>
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        <div className="min-w-0">
          <p className="min-h-8 text-xs font-medium leading-4 text-text-2 sm:min-h-10 sm:text-sm sm:leading-5">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-text sm:mt-6 sm:text-5xl">
            {value}
          </p>
        </div>
        <span
          className={`hidden h-12 w-12 shrink-0 place-items-center rounded-xl sm:grid ${toneStyle.icon}`}
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              d="M4 19h16M7 16V8m5 8V5m5 11v-3"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        </span>
      </div>
    </section>
  );
}
