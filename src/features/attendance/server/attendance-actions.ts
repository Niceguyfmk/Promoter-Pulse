"use server";

import { revalidatePath } from "next/cache";
import { createAttendanceService } from "./attendance-service";
import { checkInSchema, checkOutSchema } from "../schemas/attendance-schemas";

export async function checkInAction(formData: FormData) {
  const service = createAttendanceService();
  
  const rawData = {
    shiftId: formData.get("shiftId"),
    latitude: parseFloat(formData.get("latitude") as string),
    longitude: parseFloat(formData.get("longitude") as string)
  };

  const validated = checkInSchema.safeParse(rawData);
  if (!validated.success) {
    return { error: "Invalid request data" };
  }

  try {
    await service.checkIn(validated.data);
    revalidatePath("/activities");
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "Failed to check in" };
  }
}

export async function checkOutAction(formData: FormData) {
  const service = createAttendanceService();

  const rawData = {
    shiftId: formData.get("shiftId"),
    latitude: parseFloat(formData.get("latitude") as string),
    longitude: parseFloat(formData.get("longitude") as string)
  };

  const validated = checkOutSchema.safeParse(rawData);
  if (!validated.success) {
    return { error: "Invalid request data" };
  }

  try {
    await service.checkOut(validated.data);
    revalidatePath("/activities");
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "Failed to check out" };
  }
}
