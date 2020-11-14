export function formatPrometheusLabels(labels: object) {
  return Object.entries(labels)
    .map(([key, value]) => `${key}="${value}"`)
    .join(",");
}

/**
 * Utility to workaround TypeScript not inferring a non nullable type when filtering null objects:
 * array.filter(x => !!x) should refine Array<T|null> to Array<T>, but it doesn't for now.
 *
 * Usage: array.filter(isPresent)
 * See https://github.com/microsoft/TypeScript/issues/16069#issuecomment-565658443
 */
export function isPresent<T>(t: T | undefined | null | void): t is T {
  return t !== undefined && t !== null;
}
