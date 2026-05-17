import { useEffect, useState } from "react";
import { RIDES, type Ride } from "../data/rides";
import { loadRoute, type RouteData } from "./routeLoader";

export type LoadedRide = {
  ride: Ride;
  status: "loading" | "ready" | "error" | "no-route";
  data?: RouteData;
  error?: string;
};

/**
 * Loads every ride's GPX/KML in parallel on first render so pages can plot
 * routes on a map and read stats (distance, elevation, etc.).
 *
 * Rides without a `file` set get status "no-route" — they appear in the
 * list but don't trigger a load or show an error.
 *
 * For a small/medium number of rides (<50) this is fine. If your library
 * grows huge, switch to lazy-loading routes only when selected.
 */
export function useRideRoutes(): LoadedRide[] {
  const [state, setState] = useState<LoadedRide[]>(() =>
    RIDES.map((r) => ({
      ride: r,
      status: r.file ? "loading" : "no-route",
    })),
  );

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      RIDES.map(async (ride): Promise<LoadedRide> => {
        if (!ride.file) {
          return { ride, status: "no-route" };
        }
        try {
          const data = await loadRoute(ride.file);
          return { ride, status: "ready", data };
        } catch (err) {
          return {
            ride,
            status: "error",
            error: err instanceof Error ? err.message : String(err),
          };
        }
      }),
    ).then((results) => {
      if (!cancelled) setState(results);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
