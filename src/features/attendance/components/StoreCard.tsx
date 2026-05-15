import type { Database } from "@/shared/supabase/database.types";
import type { Route } from "next";
import Link from "next/link";
import { GpsCheckInButton } from "./GpsCheckInButton";
import { RemoteCheckInForm } from "./RemoteCheckInForm";

type StoreRow = Database["public"]["Tables"]["retail_stores"]["Row"];

type Props = {
  canManage?: boolean;
  store: StoreRow;
  toggleAction?: (formData: FormData) => void | Promise<void>;
};

export function StoreCard({ canManage, store, toggleAction }: Props) {
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address || store.name)}`;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">{store.name}</h3>
            <p className="mt-1 text-sm text-slate-500">{store.address || "No address provided"}</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              {store.is_active ? "Active" : "Inactive"}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-50 text-cyan-700">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-50 pt-4">
          {canManage ? (
            <div className="mb-4 flex items-center gap-2">
              <Link
                className="flex-1 rounded-2xl bg-slate-100 px-4 py-2 text-center text-sm font-semibold text-slate-700 transition hover:bg-cyan-50 hover:text-cyan-900"
                href={`/places/${store.id}/edit` as Route}
              >
                Edit
              </Link>
              {toggleAction ? (
                <form action={toggleAction} className="flex-1">
                  <input name="storeId" type="hidden" value={store.id} />
                  <input name="isActive" type="hidden" value={String(!store.is_active)} />
                  <button
                    className="w-full rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                    type="submit"
                  >
                    {store.is_active ? "Deactivate" : "Activate"}
                  </button>
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
            className="flex items-center justify-center gap-2 text-sm font-bold text-cyan-800 transition-colors hover:text-cyan-950"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Get Directions
          </a>
        </div>
      </div>
    </div>
  );
}
