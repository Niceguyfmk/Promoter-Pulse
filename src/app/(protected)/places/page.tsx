import { Suspense } from "react";

import { createAttendanceService } from "@/features/attendance/server/attendance-service";
import { StoreCard } from "@/features/attendance/components/StoreCard";
import { createAuthService } from "@/features/auth/server/app-auth-service";
import { updatePlaceActiveStatus } from "@/features/places/server/place-actions";
import { LoadingLink as Link } from "@/shared/loading";

async function updatePlaceActiveStatusFromPage(formData: FormData) {
  "use server";

  await updatePlaceActiveStatus(formData);
}

export default async function PlacesPage() {
  const session = await createAuthService().requireSession();
  const canManagePlaces = session.roles.some((r) => r === "admin" || r === "manager");
  const isPromoter = session.roles.includes("promoter") && !canManagePlaces;

  return (
    <main className="space-y-6 lg:space-y-8">
      <section className="space-y-4">
        <div className="flex flex-col gap-4 rounded-xl bg-card p-4 shadow-sm border border-border xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 items-center gap-4">
            <button className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text hover:bg-surface">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add filter
            </button>

            <div className="relative flex-1 max-w-md">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search for places by id, name or address"
                className="w-full rounded-lg border border-border pl-10 pr-4 py-2 text-sm outline-none focus:border-garnet focus:ring-1 focus:ring-garnet"
              />
            </div>

            <button className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text hover:bg-surface">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
              Show map
            </button>
          </div>

          <div className="flex items-center gap-4 border-t border-border pt-4 xl:border-none xl:pt-0">
            <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-border text-garnet focus:ring-garnet"
              />
              Show inactive places
            </label>

            <button className="p-2 text-text-2 hover:text-text rounded-lg border border-border">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
            </button>

            <button className="text-sm font-medium text-text-2 hover:text-text">Clear</button>

            <button className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink-2">
              Apply
            </button>
          </div>
        </div>

        {canManagePlaces && (
          <div className="flex justify-end gap-3">
            <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-text hover:bg-surface shadow-sm">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              Import
            </button>

            <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-text hover:bg-surface shadow-sm">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
              Customize columns
            </button>

            <Link
              href="/places/new"
              className="flex items-center gap-2 rounded-lg bg-garnet px-4 py-2 text-sm font-medium text-white hover:bg-garnet-dark shadow-sm transition"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New place
            </Link>
          </div>
        )}
      </section>

      <Suspense fallback={<StoresGridSkeleton isPromoter={isPromoter} />}>
        <StoresGrid canManagePlaces={canManagePlaces} isPromoter={isPromoter} />
      </Suspense>
    </main>
  );
}

async function StoresGrid({
  canManagePlaces,
  isPromoter
}: {
  canManagePlaces: boolean;
  isPromoter: boolean;
}) {
  const stores = await createAttendanceService().getStores();

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-text">
            {isPromoter ? "Assigned places" : "Retail Locations"}
          </h2>
          {isPromoter ? (
            <p className="mt-1 text-sm text-text-2">
              Use GPS check-in when you are at the assigned store.
            </p>
          ) : null}
        </div>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-sm font-medium text-text-2">
          {stores.length} stores
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stores && stores.length > 0 ? (
          stores.map((store) => (
            <StoreCard
              canManage={canManagePlaces}
              key={store.id}
              store={store}
              toggleAction={updatePlaceActiveStatusFromPage}
            />
          ))
        ) : (
          <div className="col-span-full">
            <EmptyState
              title={canManagePlaces ? "No places added" : "No places assigned"}
              description={
                canManagePlaces
                  ? "Get started by adding your first retail location."
                  : "Contact your manager for updates or assignments."
              }
            />
          </div>
        )}
      </div>
    </section>
  );
}

function StoresGridSkeleton({ isPromoter }: { isPromoter: boolean }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="animate-pulse space-y-2">
          <div className="h-7 w-40 rounded bg-slate-200" />
          {isPromoter ? <div className="h-4 w-64 rounded bg-slate-200" /> : null}
        </div>
        <div className="h-7 w-20 animate-pulse rounded-full bg-slate-200" />
      </div>
      <div className="grid animate-pulse gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div className="h-40 rounded-2xl border border-slate-200 bg-slate-100" key={index} />
        ))}
      </div>
    </section>
  );
}

function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/75 px-8 py-16 text-center shadow-sm">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-xl bg-surface text-text-2">
        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            d="M8 2v3m8-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1Z"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      </div>
      <h3 className="mt-5 text-xl font-semibold text-text">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-text-2">
        {description || "Contact your manager for updates or assignments."}
      </p>
    </div>
  );
}
