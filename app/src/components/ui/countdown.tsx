import { useEffect, useMemo, useRef, useState } from 'react';

type CountdownProps = {
  targetDate: Date;
  className?: string;
  onComplete?: () => void;
};

// Compute remaining seconds from now until target
function computeRemainingSeconds(targetDate: Date): number {
  // Ensure we work with a valid Date
  const target = targetDate instanceof Date ? targetDate : new Date(targetDate);
  const diffMs = target.getTime() - Date.now();
  // Clamp at 0 if in the past
  return Math.max(0, Math.floor(diffMs / 1000));
}

// Format seconds to HH:MM:SS (zero-padded)
function formatHms(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const h = String(hours).padStart(2, '0');
  const m = String(minutes).padStart(2, '0');
  const s = String(seconds).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export default function Countdown({
  targetDate,
  className,
  onComplete,
}: CountdownProps) {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() =>
    computeRemainingSeconds(targetDate),
  );
  const completedRef = useRef(false);

  // Recompute immediately if targetDate changes
  useEffect(() => {
    setRemainingSeconds(computeRemainingSeconds(targetDate));
    completedRef.current = false;
  }, [targetDate]);

  // Tick every second
  useEffect(() => {
    if (remainingSeconds === 0) {
      // Fire onComplete only once when reaching zero
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
      return;
    }

    const intervalId = setInterval(() => {
      setRemainingSeconds((prev) => {
        const next = Math.max(0, prev - 1);
        return next;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [remainingSeconds, onComplete]);

  const label = useMemo(() => formatHms(remainingSeconds), [remainingSeconds]);

  return <span className={className}>{label}</span>;
}
