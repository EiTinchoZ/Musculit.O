"use client";

import { useCountUp } from "@/lib/use-count-up";

export function CountUpValue({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const animated = useCountUp(value);
  return <>{animated.toFixed(decimals)}</>;
}
