"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import {
  MAX_FEATURED_COLLECTION_DAYS,
  formatDateInput,
  scheduleDurationDays,
  validateFeaturedCollectionSchedule,
  type FeaturedCollectionSchedule,
} from "@/lib/featured-collection-schedule";
import type { Category } from "@/types";

interface FeaturedCollectionSchedulerProps {
  categories: Category[];
  schedules: FeaturedCollectionSchedule[];
  onChange: (schedules: FeaturedCollectionSchedule[]) => void;
}

export function FeaturedCollectionScheduler({
  categories,
  schedules,
  onChange,
}: FeaturedCollectionSchedulerProps) {
  const today = formatDateInput(new Date());
  const defaultEnd = formatDateInput(new Date(Date.now() + 6 * 86400000));
  const [categoryId, setCategoryId] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [error, setError] = useState<string | null>(null);

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  function addSchedule() {
    if (!categoryId) {
      setError("Pick a collection.");
      return;
    }
    const validation = validateFeaturedCollectionSchedule(startDate, endDate);
    if (validation) {
      setError(validation);
      return;
    }
    if (schedules.some((s) => s.categoryId === categoryId)) {
      setError("This collection is already scheduled. Edit or remove it first.");
      return;
    }
    setError(null);
    onChange([...schedules, { categoryId, startDate, endDate }]);
    setCategoryId("");
    setStartDate(today);
    setEndDate(defaultEnd);
  }

  function removeSchedule(id: string) {
    onChange(schedules.filter((s) => s.categoryId !== id));
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">
        Schedule collections by date (up to {MAX_FEATURED_COLLECTION_DAYS} days). Only active
        schedules show on the live store homepage.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>Collection</Label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="">Select a collection…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Start date</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <Label>End date</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="button" variant="outline" onClick={addSchedule}>
        Add to calendar
      </Button>

      <div className="space-y-2">
        {schedules.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-zinc-500">
            No scheduled collections yet.
          </p>
        ) : (
          schedules.map((schedule) => {
            const cat = categoryById.get(schedule.categoryId);
            const days = scheduleDurationDays(schedule.startDate, schedule.endDate);
            const active =
              validateFeaturedCollectionSchedule(schedule.startDate, schedule.endDate) === null &&
              new Date() >= new Date(`${schedule.startDate}T00:00:00`) &&
              new Date() <= new Date(`${schedule.endDate}T23:59:59`);
            return (
              <div
                key={schedule.categoryId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
              >
                <div>
                  <p className="font-medium text-sm">{cat?.name ?? schedule.categoryId}</p>
                  <p className="text-xs text-zinc-500">
                    {formatDate(new Date(`${schedule.startDate}T12:00:00`))} →{" "}
                    {formatDate(new Date(`${schedule.endDate}T12:00:00`))} · {days} day
                    {days === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={active ? "success" : "secondary"}>
                    {active ? "Live now" : "Scheduled"}
                  </Badge>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeSchedule(schedule.categoryId)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
