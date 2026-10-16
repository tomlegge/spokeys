import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Distance units preference (km or miles), shared across the whole site.
 *
 * All route stats are computed and stored in kilometres; conversion happens
 * only at display time via the helpers returned by useUnits(). The choice is
 * persisted to localStorage so it sticks between visits, mirroring the theme.
 */

export type DistanceUnit = "km" | "mi";

const UNITS_STORAGE_KEY = "spokeys-units";
const KM_PER_MILE = 1.609344;

function getInitialUnit(): DistanceUnit {
  try {
    return localStorage.getItem(UNITS_STORAGE_KEY) === "mi" ? "mi" : "km";
  } catch {
    return "km";
  }
}

type UnitsContextValue = {
  unit: DistanceUnit;
  setUnit: (u: DistanceUnit) => void;
};

const UnitsContext = createContext<UnitsContextValue | null>(null);

export function UnitsProvider({ children }: { children: ReactNode }) {
  const [unit, setUnit] = useState<DistanceUnit>(getInitialUnit);

  useEffect(() => {
    try {
      localStorage.setItem(UNITS_STORAGE_KEY, unit);
    } catch {
      // localStorage may be unavailable (e.g. private mode); harmless to ignore.
    }
  }, [unit]);

  const value = useMemo(() => ({ unit, setUnit }), [unit]);
  return <UnitsContext.Provider value={value}>{children}</UnitsContext.Provider>;
}

export function useUnits() {
  const ctx = useContext(UnitsContext);
  if (!ctx) throw new Error("useUnits must be used inside <UnitsProvider>");
  const { unit, setUnit } = ctx;

  /** Convert a distance in km to the selected unit (number only). */
  const toUnit = useCallback(
    (km: number) => (unit === "mi" ? km / KM_PER_MILE : km),
    [unit],
  );

  /** "123.4 km" / "76.7 mi". Pass decimals=0 for rounded totals. */
  const formatDistance = useCallback(
    (km: number, decimals = 1) => `${toUnit(km).toFixed(decimals)} ${unit}`,
    [toUnit, unit],
  );

  /** "18.2 km/h" / "11.3 mph". */
  const formatSpeed = useCallback(
    (kmh: number) =>
      `${toUnit(kmh).toFixed(1)} ${unit === "mi" ? "mph" : "km/h"}`,
    [toUnit, unit],
  );

  return { unit, setUnit, toUnit, formatDistance, formatSpeed };
}

/** Segmented km / mi switch for the site header. */
export function UnitsToggle() {
  const { unit, setUnit } = useUnits();
  return (
    <div className="units-toggle" role="group" aria-label="Distance units">
      {(["km", "mi"] as const).map((u) => (
        <button
          key={u}
          type="button"
          className={"units-toggle-btn" + (unit === u ? " is-active" : "")}
          aria-pressed={unit === u}
          title={u === "km" ? "Show distances in kilometres" : "Show distances in miles"}
          onClick={() => setUnit(u)}
        >
          {u}
        </button>
      ))}
    </div>
  );
}
