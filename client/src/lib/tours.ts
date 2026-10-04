import type { TourLog } from "@utpost/shared";

export const elevationGain = (logs: TourLog[]): number => {
  let gain = 0;
  let previousElevation: number | null = null;

  for (const log of logs) {
    const elevation = log.elevation_m;
    if (elevation == null) continue;

    if (previousElevation !== null && elevation > previousElevation) {
      gain += elevation - previousElevation;
    }

    previousElevation = elevation;
  }

  return gain;
};
