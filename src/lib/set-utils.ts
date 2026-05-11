export function inferSetCount(setLabel: string) {
  const match = setLabel.match(/(\d+)(?:\s*-\s*(\d+))?\s*x/i);
  if (!match) {
    return 3;
  }

  const first = Number(match[1]);
  const second = match[2] ? Number(match[2]) : first;
  const count = Math.max(first, second);

  if (!Number.isFinite(count) || count <= 0) {
    return 3;
  }

  return count;
}

export function normalizeSetWeights(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === "string" ? item : String(item ?? "")));
  }

  if (typeof value === "string") {
    return value ? [value] : [];
  }

  return [];
}
