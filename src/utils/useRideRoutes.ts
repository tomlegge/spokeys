import { useEffect, useState } from "react";
import { RIDES, rideFiles, type Ride } from "../data/rides";
import { loadRoutes, type RouteData } from "./routeLoader";

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
 * Rides without any route file get status "no-route" — they appear in the
 * list but don't trigger a load or show an error. Rides with multiple files
 * (see `Ride.files`) are loaded together and end up with one segment per
 * source file in their RouteData.
 *
 * For a small/medium number of rides (<50) this is fine. If your library
 * grows huge, switch to lazy-loading routes only when selected.
 */
export function useRideRoutes(): LoadedRide[] {
  const [state, setState] = useState<LoadedRide[]>(() =>
    RIDES.map((r) => ({
      ride: r,
      status: rideFiles(r).length > 0 ? "loading" : "no-route",
    })),
  );

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      RIDES.map(async (ride): Promise<LoadedRide> => {
        const files = rideFiles(ride);
        if (files.length === 0) {
          return { ride, status: "no-route" };
        }
        try {
          const data = await loadRoutes(files);
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
