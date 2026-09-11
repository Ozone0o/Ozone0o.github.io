import type { CollectionEntry } from 'astro:content';

export type DailyEntry = CollectionEntry<'daily'>;

const routeDate = (date: Date) => date.toISOString().slice(0, 10);

export const dailySlug = (entry: DailyEntry) => (
  entry.data.endDate
    ? `${routeDate(entry.data.date)}--${routeDate(entry.data.endDate)}`
    : routeDate(entry.data.date)
);

export const dailyHref = (entry: DailyEntry) => `/daily/${dailySlug(entry)}/`;

export const sortDaily = (entries: DailyEntry[]) => [...entries].sort(
  (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
);
