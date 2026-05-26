/**
 * Source of truth for the main Spokeys' birthdays.
 *
 * Add / remove / amend riders here. The names should match the display names
 * used in `rides.ts` (e.g. "Steve Gee", "Tom"). Order doesn't matter — when
 * several people share a birthday, the home-page banner will list them all.
 *
 * `dob` is ISO-style "YYYY-MM-DD". Only the month and day are used for the
 * banner check — the year is stored so it's available for future features
 * (age, "x's nth birthday", etc.) but isn't compared against today.
 *
 * Placeholder values use 1900-01-01. Replace these with real dates. Anyone
 * left on a placeholder simply won't trigger the banner unless today
 * happens to be Jan 1 — in which case you'll see "Happy birthday" for a
 * suspiciously long list of riders, which is your cue to fill them in.
 *
 * To test the banner today without changing real data, temporarily set one
 * entry's dob to today's MM-DD (any year), e.g. "1985-05-26".
 */

export type Birthday = {
  name: string;
  /** ISO-style date "YYYY-MM-DD". Only MM-DD is used for matching. */
  dob: string;
};

export const BIRTHDAYS: Birthday[] = [
  // TODO: replace the 1900-01-01 placeholders with real dates of birth.
  { name: "Anita", dob: "1981-10-07" },
  { name: "Tom", dob: "1982-03-29" },
  { name: "Darren", dob: "1900-01-01" },
  { name: "Stu", dob: "1900-01-01" },
  { name: "Jamie", dob: "1900-01-01" },
  { name: "Steve Gee", dob: "1900-01-01" },
  { name: "Charlie", dob: "1900-01-01" },
  { name: "James", dob: "1900-01-01" },
  { name: "Ciaran", dob: "1900-01-01" },
  { name: "Nick", dob: "1900-01-01" },
  { name: "Gary", dob: "1900-01-01" },
  { name: "Peter", dob: "1900-01-01" },
  { name: "Kostas", dob: "1900-01-01" },
  { name: "Catherine", dob: "1900-01-01" },
  { name: "Mark", dob: "1900-01-01" },
  { name: "Steve Etches", dob: "1900-01-01" },
];

/**
 * Returns the riders whose birthday is `today` (local time).
 *
 * Matching is on month + day only — the year stored on each entry is
 * ignored. Feb 29 birthdays roll over to Feb 28 in non-leap years so the
 * person still gets a shout-out three years out of four.
 *
 * `today` defaults to `new Date()` and is only injectable for tests.
 */
export function todaysBirthdays(today: Date = new Date()): Birthday[] {
  const todayMonth = today.getMonth() + 1; // 1–12
  const todayDay = today.getDate(); // 1–31
  const isLeapYear =
    (today.getFullYear() % 4 === 0 && today.getFullYear() % 100 !== 0) ||
    today.getFullYear() % 400 === 0;

  return BIRTHDAYS.filter((b) => {
    // Parse the DOB defensively — bad strings just don't match.
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(b.dob);
    if (!m) return false;
    let month = Number(m[2]);
    let day = Number(m[3]);

    // Roll Feb 29 → Feb 28 in non-leap years so leaplings still get a banner.
    if (month === 2 && day === 29 && !isLeapYear) {
      day = 28;
    }
    return month === todayMonth && day === todayDay;
  });
}
