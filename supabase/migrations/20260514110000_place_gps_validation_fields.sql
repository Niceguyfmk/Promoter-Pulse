alter table public.retail_stores
  alter column latitude type numeric(10, 7),
  alter column longitude type numeric(10, 7),
  add column if not exists allowed_radius_meters integer not null default 100;

update public.retail_stores
set allowed_radius_meters = coalesce(geofence_radius_meters, 100)
where allowed_radius_meters is null;

create index if not exists retail_stores_gps_coordinates_idx
on public.retail_stores(latitude, longitude)
where latitude is not null and longitude is not null and deleted_at is null;

