"use client";

import Dexie, { type EntityTable } from "dexie";

export type OfflineMutationStatus = "queued" | "syncing" | "failed";

export type OfflineMutation = {
  id: string;
  tenantId: string;
  userId: string;
  operation: string;
  payload: unknown;
  status: OfflineMutationStatus;
  attempts: number;
  createdAt: string;
  lastAttemptAt: string | null;
};

class PromoterPulseOfflineDb extends Dexie {
  mutations!: EntityTable<OfflineMutation, "id">;

  constructor() {
    super("promoter-pulse-offline");
    this.version(1).stores({
      mutations: "id, tenantId, userId, operation, status, createdAt"
    });
  }
}

export const offlineDb = new PromoterPulseOfflineDb();

export async function enqueueOfflineMutation(input: Omit<OfflineMutation, "attempts" | "status">) {
  await offlineDb.mutations.add({
    ...input,
    attempts: 0,
    status: "queued"
  });
}
