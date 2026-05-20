"use client";

import { useMemo, useState } from "react";

import {
  deleteCompanyFromCompaniesPage,
  updateCompanyActiveStatusFromCompaniesPage,
  updateCompanyFromCompaniesPage
} from "./companies-page-actions";
import { FormSubmitButton } from "@/shared/loading";

export type CompanyTableRow = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  userCount: number;
  activeUserCount: number;
  createdAt: string;
};

type StatusFilter = "all" | "active" | "inactive";
type SortKey = "name" | "status" | "users" | "created";
type SortDirection = "asc" | "desc";

export function CompaniesTable({
  companies,
  currentCompanyId
}: {
  companies: CompanyTableRow[];
  currentCompanyId: string;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const visibleCompanies = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return companies
      .filter((company) => {
        const matchesSearch =
          !normalizedSearch ||
          [company.name, company.slug].join(" ").toLowerCase().includes(normalizedSearch);
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "active" && company.isActive) ||
          (statusFilter === "inactive" && !company.isActive);

        return matchesSearch && matchesStatus;
      })
      .sort((left, right) => {
        const direction = sortDirection === "asc" ? 1 : -1;

        if (sortKey === "users") {
          return (left.userCount - right.userCount) * direction;
        }

        return getSortValue(left, sortKey).localeCompare(getSortValue(right, sortKey)) * direction;
      });
  }, [companies, search, sortDirection, sortKey, statusFilter]);

  function changeSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection("asc");
  }

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/80 shadow-sm">
      <div className="space-y-4 border-b border-slate-200 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">All companies</h2>
            <p className="text-sm text-slate-500">{visibleCompanies.length} visible</p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px]">
          <input
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-cyan-700"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by company name or slug"
            type="search"
            value={search}
          />
          <select
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-cyan-700"
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            value={statusFilter}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 lg:grid-cols-[minmax(0,1.3fr)_140px_160px_220px_120px]">
          <SortButton active={sortKey === "name"} direction={sortDirection} label="Company" onClick={() => changeSort("name")} />
          <SortButton active={sortKey === "status"} direction={sortDirection} label="Status" onClick={() => changeSort("status")} />
          <SortButton active={sortKey === "users"} direction={sortDirection} label="Users" onClick={() => changeSort("users")} />
          <SortButton active={sortKey === "created"} direction={sortDirection} label="Created" onClick={() => changeSort("created")} />
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {visibleCompanies.length ? (
          visibleCompanies.map((company) => (
            <div
              className="grid gap-4 px-5 py-4 sm:px-6 lg:grid-cols-[minmax(0,1.3fr)_140px_160px_220px_120px]"
              key={company.id}
            >
              <form action={updateCompanyFromCompaniesPage} className="flex min-w-0 gap-2">
                <input name="companyId" type="hidden" value={company.id} />
                <input
                  className="min-h-11 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-cyan-700"
                  defaultValue={company.name}
                  name="name"
                  required
                />
                <FormSubmitButton
                  className="min-h-11 rounded-2xl bg-slate-100 px-4 text-sm font-semibold text-slate-700 transition hover:bg-cyan-50 hover:text-cyan-900"
                  loadingLabel="Saving..."
                  type="submit"
                >
                  Save
                </FormSubmitButton>
              </form>

              <form action={updateCompanyActiveStatusFromCompaniesPage}>
                <input name="companyId" type="hidden" value={company.id} />
                <input name="isActive" type="hidden" value={String(!company.isActive)} />
                <FormSubmitButton
                  className={[
                    "min-h-10 rounded-2xl px-4 text-xs font-semibold uppercase tracking-[0.16em] transition",
                    company.isActive
                      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  ].join(" ")}
                  disabled={company.id === currentCompanyId}
                  loadingLabel="Updating..."
                  type="submit"
                >
                  {company.isActive ? "Active" : "Inactive"}
                </FormSubmitButton>
              </form>

              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-950">{company.userCount}</p>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                  {company.activeUserCount} active
                </p>
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-700">
                  {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
                    new Date(company.createdAt)
                  )}
                </p>
                <p className="truncate text-xs text-slate-400">{company.slug}</p>
              </div>

              <div>
                {company.id !== currentCompanyId ? (
                  <form action={deleteCompanyFromCompaniesPage}>
                    <input name="companyId" type="hidden" value={company.id} />
                    <FormSubmitButton
                      className="min-h-11 rounded-2xl bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                      loadingLabel="Deleting..."
                      type="submit"
                    >
                      Delete
                    </FormSubmitButton>
                  </form>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <div className="px-5 py-12 text-center text-sm text-slate-500">No companies found.</div>
        )}
      </div>
    </section>
  );
}

function SortButton({
  active,
  direction,
  label,
  onClick
}: {
  active: boolean;
  direction: SortDirection;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className="flex min-h-9 items-center gap-2 text-left" onClick={onClick} type="button">
      <span>{label}</span>
      <span className={active ? "text-cyan-800" : "text-slate-300"}>
        {active && direction === "desc" ? "DESC" : "ASC"}
      </span>
    </button>
  );
}

function getSortValue(company: CompanyTableRow, key: SortKey) {
  if (key === "name") {
    return company.name;
  }

  if (key === "status") {
    return company.isActive ? "active" : "inactive";
  }

  return company.createdAt;
}
