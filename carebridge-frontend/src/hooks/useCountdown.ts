import { useEffect, useState } from "react";

interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isNow: boolean;   // within the next 5 minutes
  isPast: boolean;  // appointment time has passed
  formatted: string; // human-readable string
}

/**
 * Counts down from now to the given ISO datetime string.
 * Updates every second while mounted.
 */
export function useCountdown(dateTimeStr: string | null | undefined): CountdownResult {
  const compute = (): CountdownResult => {
    if (!dateTimeStr) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isNow: false, isPast: false, formatted: "--" };
    }

    const target = new Date(dateTimeStr).getTime();
    const now = Date.now();
    const diff = target - now;

    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isNow: false, isPast: true, formatted: "Appointment time passed" };
    }

    const totalSeconds = Math.floor(diff / 1000);
    const days    = Math.floor(totalSeconds / 86400);
    const hours   = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const isNow   = diff < 5 * 60 * 1000; // within 5 minutes

    let formatted = "";
    if (days > 0) formatted = `${days}d ${hours}h ${minutes}m`;
    else if (hours > 0) formatted = `${hours}h ${minutes}m ${seconds}s`;
    else formatted = `${minutes}m ${seconds}s`;

    return { days, hours, minutes, seconds, isNow, isPast: false, formatted };
  };

  const [result, setResult] = useState<CountdownResult>(compute);

  useEffect(() => {
    if (!dateTimeStr) return;
    const id = setInterval(() => setResult(compute()), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateTimeStr]);

  return result;
}
