/** Normalise any date to a UTC "YYYY-MM-DD" string so one record exists per student per day. */
export function dateOnly(input?: Date | string): string {
  const d = input ? new Date(input) : new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
export const currentWeekday = () => WEEKDAYS[new Date().getUTCDay()];
