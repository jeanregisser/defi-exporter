export function formatPrometheusLabels(labels: object) {
  return Object.entries(labels)
    .map(([key, value]) => `${key}:"${value}"`)
    .join(",");
}
