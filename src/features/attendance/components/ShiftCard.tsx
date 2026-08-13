import { AttendanceButtons } from "./AttendanceButtons";

type ShiftStatus = "scheduled" | "checked_in" | "checked_out" | "missed";

type ShiftWithStore = {
  id: string;
  status: ShiftStatus;
  scheduled_start_at: string;
  scheduled_end_at: string;
  retail_stores?: {
    name?: string | null;
    address?: string | null;
  } | null;
};

type Props = {
  shift: ShiftWithStore;
};

const statusStyles: Record<ShiftStatus, string> = {
  scheduled: "bg-info-tint text-info",
  checked_in: "bg-success-tint text-success",
  checked_out: "bg-surface text-text-2",
  missed: "bg-danger-tint text-danger"
};

export function ShiftCard({ shift }: Props) {
  const startDate = new Date(shift.scheduled_start_at);
  const endDate = new Date(shift.scheduled_end_at);
  const startTime = startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const endTime = endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.3)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_48px_-28px_rgba(15,23,42,0.3)] sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <span
            className={[
              "inline-flex rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em]",
              statusStyles[shift.status]
            ].join(" ")}
          >
            {shift.status.replace("_", " ")}
          </span>

          <h3 className="mt-5 text-3xl font-semibold tracking-tight text-text">
            {shift.retail_stores?.name || "Unknown Store"}
          </h3>
          <p className="mt-2 text-base text-text-2">
            {shift.retail_stores?.address || "No address provided"}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-5 text-text">
            <div className="flex items-center gap-2.5">
              <svg
                className="h-5 w-5 text-text-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
              </svg>
              <span className="text-lg font-semibold">
                {startTime} - {endTime}
              </span>
            </div>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <p className="text-lg font-medium text-text-2">
            {startDate.toLocaleDateString(undefined, {
              weekday: "short",
              day: "numeric",
              month: "short"
            })}
          </p>
        </div>
      </div>

      <AttendanceButtons shiftId={shift.id} status={shift.status} />
    </article>
  );
}
