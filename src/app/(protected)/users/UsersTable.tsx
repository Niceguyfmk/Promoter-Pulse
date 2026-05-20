"use client";

import { useMemo, useState } from "react";

import type { Role } from "@/core/auth/roles";
import {
  deleteUserFromUsersPage,
  updateUserActiveStatusFromUsersPage,
  updateUserRoleFromUsersPage
} from "./users-page-actions";
import { FormSubmitButton } from "@/shared/loading";

export type UsersTableRow = {
  id: string;
  email: string;
  fullName: string | null;
  company: string;
  companyIsActive: boolean;
  isActive: boolean;
  role: Role;
};

type SortKey = "name" | "email" | "company" | "role" | "status";
type SortDirection = "asc" | "desc";

const roleOptions: Role[] = ["admin", "manager", "promoter"];

export function UsersTable({
  currentUserId,
  users
}: {
  currentUserId: string;
  users: UsersTableRow[];
}) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const companies = useMemo(
    () => Array.from(new Set(users.map((user) => user.company))).sort((a, b) => a.localeCompare(b)),
    [users]
  );

  const visibleUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return users
      .filter((user) => {
        const matchesSearch =
          !normalizedSearch ||
          [user.fullName || "", user.email, user.company, user.role]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch);
        const matchesRole = roleFilter === "all" || user.role === roleFilter;
        const matchesCompany = companyFilter === "all" || user.company === companyFilter;

        return matchesSearch && matchesRole && matchesCompany;
      })
      .sort((left, right) => {
        const leftValue = getSortValue(left, sortKey);
        const rightValue = getSortValue(right, sortKey);
        const direction = sortDirection === "asc" ? 1 : -1;

        return leftValue.localeCompare(rightValue) * direction;
      });
  }, [companyFilter, roleFilter, search, sortDirection, sortKey, users]);

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
            <h2 className="text-lg font-semibold text-slate-950">All users</h2>
            <p className="text-sm text-slate-500">{visibleUsers.length} visible</p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_220px]">
          <input
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-cyan-700"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email, company, or role"
            type="search"
            value={search}
          />
          <select
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-cyan-700"
            onChange={(event) => setRoleFilter(event.target.value as "all" | Role)}
            value={roleFilter}
          >
            <option value="all">All roles</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <select
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-cyan-700"
            onChange={(event) => setCompanyFilter(event.target.value)}
            value={companyFilter}
          >
            <option value="all">All companies</option>
            {companies.map((company) => (
              <option key={company} value={company}>
                {company}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_140px_250px]">
          <SortButton active={sortKey === "name"} direction={sortDirection} label="User" onClick={() => changeSort("name")} />
          <SortButton active={sortKey === "company"} direction={sortDirection} label="Company" onClick={() => changeSort("company")} />
          <SortButton active={sortKey === "status"} direction={sortDirection} label="Status" onClick={() => changeSort("status")} />
          <SortButton active={sortKey === "role"} direction={sortDirection} label="Role" onClick={() => changeSort("role")} />
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {visibleUsers.length ? (
          visibleUsers.map((user) => (
            <div
              className="grid gap-4 px-5 py-4 sm:px-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_140px_250px]"
              key={user.id}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950">
                  {user.fullName || "Unnamed user"}
                </p>
                <p className="truncate text-sm text-slate-500">{user.email}</p>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-700">{user.company}</p>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                  Company {user.companyIsActive ? "active" : "inactive"}
                </p>
              </div>
              <form action={updateUserActiveStatusFromUsersPage}>
                <input name="userId" type="hidden" value={user.id} />
                <input name="isActive" type="hidden" value={String(!user.isActive)} />
                <FormSubmitButton
                  className={[
                    "min-h-10 rounded-2xl px-4 text-xs font-semibold uppercase tracking-[0.16em] transition",
                    user.isActive
                      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  ].join(" ")}
                  disabled={user.id === currentUserId}
                  loadingLabel="Updating..."
                  type="submit"
                >
                  {user.isActive ? "Active" : "Inactive"}
                </FormSubmitButton>
              </form>
              <div className="flex flex-wrap items-center gap-2">
                <form action={updateUserRoleFromUsersPage} className="flex items-center gap-2">
                  <input name="userId" type="hidden" value={user.id} />
                  <select
                    className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-cyan-700"
                    defaultValue={user.role}
                    name="role"
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  <FormSubmitButton
                    className="min-h-11 rounded-2xl bg-slate-100 px-4 text-sm font-semibold text-slate-700 transition hover:bg-cyan-50 hover:text-cyan-900"
                    loadingLabel="Saving..."
                    type="submit"
                  >
                    Save
                  </FormSubmitButton>
                </form>
                {user.id !== currentUserId ? (
                  <form action={deleteUserFromUsersPage}>
                    <input name="userId" type="hidden" value={user.id} />
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
          <div className="px-5 py-12 text-center text-sm text-slate-500">No users found.</div>
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

function getSortValue(user: UsersTableRow, key: SortKey) {
  if (key === "name") {
    return user.fullName || user.email;
  }

  if (key === "email") {
    return user.email;
  }

  if (key === "company") {
    return user.company;
  }

  if (key === "role") {
    return user.role;
  }

  return user.isActive ? "active" : "inactive";
}
