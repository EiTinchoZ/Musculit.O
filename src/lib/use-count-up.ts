"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Anima un numero desde su valor anterior hasta `target` en `durationMs`
 * cuando `target` cambia (no en el mount inicial). Respeta
 * prefers-reduced-motion mostrando el valor final directamente.
 */
export function useCountUp(target: number, durationMs = 700): number {
  const [animatedValue, setAnimatedValue] = useState<number | null>(null);
  const prevTargetRef = useRef(target);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const reduceMotion =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = prevTargetRef.current;

    if (reduceMotion || !Number.isFinite(target) || from === target) {
      prevTargetRef.current = target;
      return;
    }

    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedValue(from + (target - from) * eased);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        prevTargetRef.current = target;
        setAnimatedValue(null);
      }
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [target, durationMs]);

  return animatedValue ?? target;
}
