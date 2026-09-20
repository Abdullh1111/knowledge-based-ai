"use client";

import { useEffect, useState, type ReactNode } from "react";
import { checkHealth } from "@/lib/api";

const RETRY_INTERVAL_MS = 3000;
const SLOW_WAKE_THRESHOLD_MS = 20000;

export default function ServerWakeGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();

    const tick = async () => {
      const ok = await checkHealth();
      if (cancelled) return;

      if (ok) {
        setReady(true);
        return;
      }

      setElapsedMs(Date.now() - startedAt);
      setTimeout(tick, RETRY_INTERVAL_MS);
    };

    tick();
    return () => {
      cancelled = true;
    };
  }, []);

  if (ready) return <>{children}</>;

  const isTakingAWhile = elapsedMs > SLOW_WAKE_THRESHOLD_MS;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 px-6 text-center dark:bg-black">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
      <div className="max-w-sm space-y-1.5">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Waking up the server</p>
        <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          This app runs on a free hosting tier that spins down when idle, so the backend can take up to
          a minute to start after a period of inactivity. Thanks for your patience.
        </p>
        {isTakingAWhile && (
          <p className="text-xs leading-relaxed text-zinc-400 dark:text-zinc-500">
            Still starting up — free-tier cold starts occasionally take a little longer than usual.
          </p>
        )}
      </div>
    </div>
  );
}
