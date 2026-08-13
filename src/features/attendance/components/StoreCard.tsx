import type { Database } from "@/shared/supabase/database.types";
import type { Route } from "next";
import { GpsCheckInButton } from "./GpsCheckInButton";
import { RemoteCheckInForm } from "./RemoteCheckInForm";
import { FormSubmitButton, LoadingLink } from "@/shared/loading";

type StoreRow = Database["public"]["Tables"]["retail_stores"]["Row"];

type Props = {
  canManage?: boolean;
  store: StoreRow;
  toggleAction?: (formData: FormData) => void | Promise<void>;
};

export function StoreCard({ canManage, store, toggleAction }: Props) {
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address || store.name)}`;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-text">{store.name}</h3>
            <p className="mt-1 text-sm text-text-2">{store.address || "No address provided"}</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-text-2">
              {store.is_active ? "Active" : "Inactive"}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-garnet-tint text-garnet">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-4">
          {canManage ? (
            <div className="mb-4 flex items-center gap-2">
              <LoadingLink
                className="flex-1 rounded-lg bg-surface px-4 py-2 text-center text-sm font-semibold text-text transition hover:bg-garnet-tint hover:text-garnet"
                href={`/places/${store.id}/edit` as Route}
              >
                Edit
              </LoadingLink>
              {toggleAction ? (
                <form action={toggleAction} className="flex-1">
                  <input name="storeId" type="hidden" value={store.id} />
                  <input name="isActive" type="hidden" value={String(!store.is_active)} />
                  <FormSubmitButton
                    className="w-full rounded-lg bg-surface px-4 py-2 text-sm font-semibold text-text transition hover:bg-border"
                    loadingLabel={store.is_active ? "Deactivating..." : "Activating..."}
                    type="submit"
                  >
                    {store.is_active ? "Deactivate" : "Activate"}
                  </FormSubmitButton>
                </form>
              ) : null}
            </div>
          ) : (
            <div className="mb-4 grid grid-cols-2 gap-3">
              <RemoteCheckInForm storeId={store.id} />
              <GpsCheckInButton
                storeId={store.id}
                storeLocation={{
                  latitude: store.latitude,
                  longitude: store.longitude,
                  allowedRadiusMeters: store.allowed_radius_meters ?? store.geofence_radius_meters
                }}
              />
            </div>
          )}
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-sm font-bold text-garnet transition-colors hover:text-garnet-dark"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            Get Directions
          </a>
        </div>
      </div>
    </div>
  );
}
