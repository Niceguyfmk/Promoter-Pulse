import type { Route } from "next";

import {
  createScheduleService,
  type ScheduleEvent,
  type ScheduleEventStatus
} from "@/features/schedule/server/schedule-service";

type ScheduleSearchParams = {
  month?: string;
};

type CalendarDay = {
  date: Date;
  dateKey: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekEnd: boolean;
};

const statusConfig: Record<
  ScheduleEventStatus,
  {
    border: string;
    dot: string;
    label: string;
    marker: string;
    text: string;
  }
> = {
  done: {
    border: "border-teal-500",
    dot: "bg-teal-500",
    label: "Done",
    marker: "bg-teal-500 text-white",
    text: "text-teal-700"
  },
  upcoming: {
    border: "border-orange-400",
    dot: "bg-orange-400",
    label: "Upcoming",
    marker: "bg-orange-400 text-white",
    text: "text-orange-700"
  },
  missed: {
    border: "border-red-500",
    dot: "bg-red-500",
    label: "Missed",
    marker: "bg-red-500 text-white",
    text: "text-red-700"
  },
  unplanned: {
    border: "border-blue-500",
    dot: "bg-blue-500",
    label: "Unplanned",
    marker: "bg-blue-500 text-white",
    text: "text-blue-700"
  }
};

export default async function SchedulePage({
  searchParams
}: {
  searchParams: Promise<ScheduleSearchParams>;
}) {
  const params = await searchParams;
  const visibleMonth = parseMonth(params.month);
  const gridDays = buildCalendarDays(visibleMonth);
  const firstGridDay = gridDays[0] ?? { date: visibleMonth };
  const lastGridDay = gridDays[gridDays.length - 1] ?? { date: visibleMonth };
  const rangeStart = startOfDay(firstGridDay.date);
  const rangeEnd = addDays(startOfDay(lastGridDay.date), 1);
  const schedule = await createScheduleService().getCalendarEvents(rangeStart, rangeEnd);
  const eventsByDay = groupEventsByDay(schedule.events);
  const previousMonth = addMonths(visibleMonth, -1);
  const nextMonth = addMonths(visibleMonth, 1);

  return (
    <main className="space-y-6 lg:space-y-8">
      <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Schedule
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 xl:justify-end">
          <Legend />
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-1 shadow-sm">
            <a
              aria-label="Previous month"
              className="grid h-9 w-9 place-items-center rounded-xl text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
              href={monthHref(previousMonth)}
            >
              <span aria-hidden="true" className="text-xl leading-none">
                &lt;
              </span>
            </a>
            <p className="min-w-32 text-center text-lg font-semibold text-slate-950">
              {formatMonthHeading(visibleMonth)}
            </p>
            <a
              aria-label="Next month"
              className="grid h-9 w-9 place-items-center rounded-xl text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
              href={monthHref(nextMonth)}
            >
              <span aria-hidden="true" className="text-xl leading-none">
                &gt;
              </span>
            </a>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((weekday) => (
            <div className="py-3" key={weekday}>
              {weekday}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {gridDays.map((day) => {
            const events = eventsByDay.get(day.dateKey) ?? [];

            return (
              <div
                className={[
                  "min-h-32 border-b border-r border-slate-200 p-2 last:border-r-0 sm:min-h-36",
                  day.isWeekEnd ? "border-r-0" : "",
                  day.isToday ? "bg-yellow-50" : "",
                  !day.isCurrentMonth ? "bg-slate-50/60 text-slate-300" : "text-slate-700"
                ].join(" ")}
                key={day.dateKey}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={[
                      "text-xs tabular-nums",
                      day.isCurrentMonth ? "text-slate-500" : "text-slate-300"
                    ].join(" ")}
                  >
                    {day.date.getDate()}
                  </span>
                  {events.length === 0 ? (
                    <span aria-hidden="true" className="text-lg font-bold leading-none text-slate-200">
                      +
                    </span>
                  ) : null}
                </div>

                <div className="mt-2 space-y-1.5">
                  {events.slice(0, 3).map((event) => (
                    <CalendarEvent event={event} key={`${event.source}-${event.id}`} />
                  ))}
                  {events.length > 3 ? (
                    <p className="truncate rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
                      +{events.length - 3} more
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-2">
      {(["done", "upcoming", "missed", "unplanned"] as const).map((status) => {
        const config = statusConfig[status];

        return (
          <span
            className={`inline-flex h-8 items-center gap-2 rounded-full border bg-white px-3 text-xs font-bold uppercase ${config.border} ${config.text}`}
            key={status}
          >
            <span className={`h-3.5 w-3.5 rounded-full ${config.dot}`} />
            {config.label}
          </span>
        );
      })}
    </div>
  );
}

function CalendarEvent({ event }: { event: ScheduleEvent }) {
  const config = statusConfig[event.status];

  return (
    <article
      className={`rounded-lg px-2 py-1 text-xs font-semibold shadow-sm ${config.marker}`}
      title={`${event.title} - ${event.storeName}`}
    >
      <p className="truncate">
        <span className="font-black">{formatEventTime(event.startsAt)}</span> {event.promoterName}
      </p>
      <p className="truncate text-white/85">{event.storeName}</p>
    </article>
  );
}

function buildCalendarDays(monthDate: Date): CalendarDay[] {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const gridStart = addDays(monthStart, -monthStart.getDay());
  const gridEnd = addDays(monthEnd, 6 - monthEnd.getDay());
  const days: CalendarDay[] = [];
  const todayKey = dateKey(new Date());

  for (let current = gridStart; current <= gridEnd; current = addDays(current, 1)) {
    const key = dateKey(current);
    days.push({
      date: current,
      dateKey: key,
      isCurrentMonth: current.getMonth() === monthDate.getMonth(),
      isToday: key === todayKey,
      isWeekEnd: current.getDay() === 6
    });
  }

  return days;
}

function groupEventsByDay(events: ScheduleEvent[]) {
  const grouped = new Map<string, ScheduleEvent[]>();

  for (const event of events) {
    const key = dateKey(new Date(event.startsAt));
    const current = grouped.get(key) ?? [];
    current.push(event);
    grouped.set(key, current);
  }

  return grouped;
}

function parseMonth(value: string | undefined) {
  const match = value?.match(/^(\d{4})-(\d{2})$/);

  if (!match) {
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  }

  return new Date(year, month - 1, 1);
}

function monthHref(date: Date) {
  return `/schedule?month=${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` as Route;
}

function addMonths(date: Date, count: number) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

function addDays(date: Date, count: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + count);
  return next;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatMonthHeading(date: Date) {
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(date);
}

function formatEventTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}
