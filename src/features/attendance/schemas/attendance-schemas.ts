import { z } from "zod";

export const checkInSchema = z.object({
  shiftId: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});

export const checkOutSchema = z.object({
  shiftId: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});

export type CheckInRequest = z.infer<typeof checkInSchema>;
export type CheckOutRequest = z.infer<typeof checkOutSchema>;
