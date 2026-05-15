"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { parseGoogleMapsCoordinates } from "../lib/google-maps-coordinates";

export type CompanyOption = { id: string; name: string };
export type RepresentativeOption = { id: string; name: string; email: string; tenantId: string };
export type PromoterOption = { id: string; name: string; email: string; tenantId: string };
export type TagOption = { id: string; name: string };

export type PlaceFormInitialValue = {
  id?: string;
  name?: string | null;
  externalCode?: string | null;
  isActive?: boolean;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
  country?: string | null;
  contactName?: string | null;
  contactTitle?: string | null;
  contactEmail?: string | null;
  website?: string | null;
  phone?: string | null;
  cellPhone?: string | null;
  note?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  allowedRadiusMeters?: number | null;
  companyId?: string;
  promoterIds?: string[];
  representativeIds?: string[];
  tagNames?: string[];
};

export function PlaceForm({
  action,
  companies,
  initialValue,
  promoters,
  representatives,
  submitLabel,
  tags
}: {
  action: (formData: FormData) => void | Promise<void>;
  companies: CompanyOption[];
  initialValue?: PlaceFormInitialValue;
  promoters: PromoterOption[];
  representatives: RepresentativeOption[];
  submitLabel: string;
  tags: TagOption[];
}) {
  const [isActive, setIsActive] = useState(initialValue?.isActive ?? true);
  const [selectedCompany, setSelectedCompany] = useState(
    initialValue?.companyId || companies[0]?.id || ""
  );
  const [selectedPromoters, setSelectedPromoters] = useState<string[]>(
    initialValue?.promoterIds || []
  );
  const [selectedReps, setSelectedReps] = useState<string[]>(initialValue?.representativeIds || []);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialValue?.tagNames || []);
  const [tagSearch, setTagSearch] = useState("");
  const [latitude, setLatitude] = useState(initialValue?.latitude?.toString() || "");
  const [longitude, setLongitude] = useState(initialValue?.longitude?.toString() || "");
  const [mapsCoordinates, setMapsCoordinates] = useState("");
  const [coordinateMessage, setCoordinateMessage] = useState<string | null>(null);

  const filteredTags = useMemo(() => {
    const existingNames = new Set(tags.map((t) => t.name));
    const customTags = selectedTags
      .filter((name) => !existingNames.has(name))
      .map((name) => ({ id: `custom-${name}`, name }));
    const allTags = [...tags, ...customTags];

    const query = tagSearch.trim().toLowerCase();
    return query ? allTags.filter((tag) => tag.name.toLowerCase().includes(query)) : allTags;
  }, [tagSearch, tags, selectedTags]);
  const filteredPromoters = promoters.filter((promoter) => promoter.tenantId === selectedCompany);
  const filteredRepresentatives = representatives.filter((rep) => rep.tenantId === selectedCompany);
  const canAddSearchedTag =
    tagSearch.trim() &&
    !tags.some((tag) => tag.name.toLowerCase() === tagSearch.trim().toLowerCase()) &&
    !selectedTags.some((name) => name.toLowerCase() === tagSearch.trim().toLowerCase());

  function toggleValue(current: string[], value: string) {
    return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
  }

  function applyMapsCoordinates(value: string) {
    setMapsCoordinates(value);
    setCoordinateMessage(null);

    if (!value.trim()) {
      return;
    }

    const coordinates = parseGoogleMapsCoordinates(value);
    if (!coordinates) {
      setCoordinateMessage("Could not find coordinates in that Google Maps value.");
      return;
    }

    setLatitude(coordinates.latitude.toString());
    setLongitude(coordinates.longitude.toString());
    setCoordinateMessage("Coordinates extracted.");
  }

  return (
    <form action={action} className="space-y-8">
      {initialValue?.id ? <input name="storeId" type="hidden" value={initialValue.id} /> : null}
      <input name="companyId" type="hidden" value={selectedCompany} />
      {selectedPromoters.map((id) => (
        <input key={id} name="promoterIds" type="hidden" value={id} />
      ))}
      {selectedReps.map((id) => (
        <input key={id} name="representativeIds" type="hidden" value={id} />
      ))}
      {selectedTags.map((name) => (
        <input key={name} name="tagNames" type="hidden" value={name} />
      ))}

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="border-b border-slate-100 pb-3 text-lg font-semibold text-slate-900">
            Place Attributes
          </h2>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Status *</label>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-700 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              name="isActive"
              onChange={(event) => setIsActive(event.target.value === "true")}
              value={String(isActive)}
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          {initialValue?.externalCode ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">ID</label>
              <input
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500"
                readOnly
                value={initialValue.externalCode}
              />
            </div>
          ) : null}

          <Field defaultValue={initialValue?.name || ""} label="Name *" name="name" required />

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Company *</label>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-700 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              onChange={(event) => {
                setSelectedCompany(event.target.value);
                setSelectedPromoters([]);
                setSelectedReps([]);
              }}
              required
              value={selectedCompany}
            >
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Representatives</p>
            <div className="grid gap-2 rounded-2xl border border-slate-200 p-3">
              {filteredRepresentatives.length ? (
                filteredRepresentatives.map((rep) => (
                  <label className="flex items-center gap-3 text-sm text-slate-700" key={rep.id}>
                    <input
                      checked={selectedReps.includes(rep.id)}
                      className="h-4 w-4 rounded border-slate-300 text-cyan-700"
                      onChange={() => setSelectedReps((current) => toggleValue(current, rep.id))}
                      type="checkbox"
                    />
                    <span>
                      {rep.name} <span className="text-slate-400">{rep.email}</span>
                    </span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-slate-500">No managers or admins found for this company.</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Promoters</p>
            <div className="grid gap-2 rounded-2xl border border-slate-200 p-3">
              {filteredPromoters.length ? (
                filteredPromoters.map((promoter) => (
                  <label className="flex items-center gap-3 text-sm text-slate-700" key={promoter.id}>
                    <input
                      checked={selectedPromoters.includes(promoter.id)}
                      className="h-4 w-4 rounded border-slate-300 text-cyan-700"
                      onChange={() =>
                        setSelectedPromoters((current) => toggleValue(current, promoter.id))
                      }
                      type="checkbox"
                    />
                    <span>
                      {promoter.name} <span className="text-slate-400">{promoter.email}</span>
                    </span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-slate-500">No promoters found for this company.</p>
              )}
            </div>
          </div>

        </section>

        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="border-b border-slate-100 pb-3 text-lg font-semibold text-slate-900">Tags</h2>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-700"
            onChange={(event) => setTagSearch(event.target.value)}
            placeholder="Find or add tag"
            value={tagSearch}
          />
          <div className="grid gap-3">
            {canAddSearchedTag ? (
              <button
                className="flex items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setSelectedTags((current) => Array.from(new Set([...current, tagSearch.trim()])));
                  setTagSearch("");
                }}
                type="button"
              >
                <span className="text-xl">+</span>
                Add {tagSearch.trim()} tag
              </button>
            ) : null}
            {filteredTags.map((tag) => (
              <label className="flex items-center gap-3 text-sm text-slate-700" key={tag.id}>
                <input
                  checked={selectedTags.includes(tag.name)}
                  className="h-4 w-4 rounded border-slate-300 text-cyan-700"
                  onChange={() => setSelectedTags((current) => toggleValue(current, tag.name))}
                  type="checkbox"
                />
                {tag.name}
              </label>
            ))}
          </div>
        </section>
      </div>

      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="border-b border-slate-100 pb-3 text-lg font-semibold text-slate-900">
          Address Information
        </h2>
        <div className="grid gap-5 md:grid-cols-2">
          <Field defaultValue={initialValue?.address || ""} label="Address" name="address" wide />
          <Field defaultValue={initialValue?.city || ""} label="City" name="city" />
          <Field defaultValue={initialValue?.state || ""} label="State" name="state" />
          <Field defaultValue={initialValue?.postalCode || ""} label="ZIP" name="postalCode" />
          <Field defaultValue={initialValue?.countryCode || ""} label="Country Code" name="countryCode" />
          <Field defaultValue={initialValue?.country || ""} label="Country" name="country" wide />
        </div>
      </section>

      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="border-b border-slate-100 pb-3 text-lg font-semibold text-slate-900">
          Store GPS Location
        </h2>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Google Maps link or coordinates</label>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            onChange={(event) => applyMapsCoordinates(event.target.value)}
            placeholder="Paste a Google Maps link or 12.9715987, 77.5945627"
            type="text"
            value={mapsCoordinates}
          />
          {coordinateMessage ? (
            <p className="text-xs font-medium text-slate-500">{coordinateMessage}</p>
          ) : null}
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Latitude</label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              max="90"
              min="-90"
              name="latitude"
              onChange={(event) => setLatitude(event.target.value)}
              step="0.0000001"
              type="number"
              value={latitude}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Longitude</label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              max="180"
              min="-180"
              name="longitude"
              onChange={(event) => setLongitude(event.target.value)}
              step="0.0000001"
              type="number"
              value={longitude}
            />
          </div>
          <Field
            defaultValue={(initialValue?.allowedRadiusMeters ?? 100).toString()}
            label="Allowed radius meters"
            name="allowedRadiusMeters"
            type="number"
          />
        </div>
      </section>

      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="border-b border-slate-100 pb-3 text-lg font-semibold text-slate-900">
          Contact Information
        </h2>
        <div className="grid gap-5 md:grid-cols-2">
          <Field defaultValue={initialValue?.contactName || ""} label="Contact name" name="contactName" />
          <Field defaultValue={initialValue?.contactTitle || ""} label="Contact title" name="contactTitle" />
          <Field defaultValue={initialValue?.contactEmail || ""} label="Email" name="contactEmail" type="email" />
          <Field defaultValue={initialValue?.website || ""} label="Website" name="website" type="url" />
          <Field defaultValue={initialValue?.phone || ""} label="Phone" name="phone" />
          <Field defaultValue={initialValue?.cellPhone || ""} label="Cell phone" name="cellPhone" />
        </div>
      </section>

      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="border-b border-slate-100 pb-3 text-lg font-semibold text-slate-900">Notes</h2>
        <textarea
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          defaultValue={initialValue?.note || ""}
          name="note"
          placeholder="Add any additional notes here..."
          rows={4}
        />
      </section>

      <div className="flex items-center justify-end gap-3">
        <Link
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          href="/places"
        >
          Discard
        </Link>
        <button
          className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
          type="submit"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function Field({
  defaultValue,
  label,
  name,
  required,
  type = "text",
  wide
}: {
  defaultValue: string;
  label: string;
  name: string;
  required?: boolean;
  type?: string;
  wide?: boolean;
}) {
  return (
    <div className={["space-y-1.5", wide ? "md:col-span-2" : ""].join(" ")}>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
        defaultValue={defaultValue}
        name={name}
        required={required}
        type={type}
      />
    </div>
  );
}
