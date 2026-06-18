export interface FeaturedCollectionSchedule {
  categoryId: string;
  startDate: string;
  endDate: string;
}

export const MAX_FEATURED_COLLECTION_DAYS = 40;
export const MAX_FEATURED_ROTATE_SECONDS = 40;

export function parseDateOnly(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function scheduleDurationDays(startDate: string, endDate: string): number {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

export function validateFeaturedCollectionSchedule(
  startDate: string,
  endDate: string
): string | null {
  if (!startDate || !endDate) return "Pick a start and end date.";
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Invalid date.";
  }
  if (end < start) return "End date must be on or after the start date.";
  const days = scheduleDurationDays(startDate, endDate);
  if (days > MAX_FEATURED_COLLECTION_DAYS) {
    return `Featured collections can run up to ${MAX_FEATURED_COLLECTION_DAYS} days.`;
  }
  return null;
}

export function isFeaturedCollectionScheduleActive(
  schedule: FeaturedCollectionSchedule,
  now = new Date()
): boolean {
  const start = parseDateOnly(schedule.startDate);
  const end = parseDateOnly(schedule.endDate);
  end.setHours(23, 59, 59, 999);
  const t = now.getTime();
  return t >= start.getTime() && t <= end.getTime();
}

export function resolveActiveFeaturedCollectionIds(
  schedules: FeaturedCollectionSchedule[] | undefined,
  legacyIds: string[] | undefined,
  now = new Date()
): string[] {
  if (schedules?.length) {
    return schedules
      .filter((s) => isFeaturedCollectionScheduleActive(s, now))
      .map((s) => s.categoryId);
  }
  return legacyIds ?? [];
}

export function schedulesFromLegacyIds(ids: string[]): FeaturedCollectionSchedule[] {
  const today = formatDateInput(new Date());
  const end = formatDateInput(new Date(Date.now() + 6 * 86400000));
  return ids.map((categoryId) => ({ categoryId, startDate: today, endDate: end }));
}
