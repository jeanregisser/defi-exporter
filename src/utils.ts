import snakeCase from "lodash.snakecase";
import BigNumber from "bignumber.js";
import puppeteer from "puppeteer";

type MetricsOptions<T> = {
  namespace: string;
  keys: Array<keyof T>;
  keyMappings?: Partial<Record<keyof T, string>>;
  labels?: Record<string, string>;
  labelKeys?: Array<keyof T>;
  labelMappings?: Partial<Record<keyof T, string>>;
};

export function getMetrics<T>(val: T | T[], options: MetricsOptions<T>) {
  if (Array.isArray(val)) {
    return getMetricsFromArray(val, options);
  }

  return getMetricsFromObject(val, options);
}

function getMetricsFromArray<T>(arr: T[], options: MetricsOptions<T>) {
  return arr.flatMap((val) => getMetricsFromObject(val, options));
}

function getMetricsFromObject<T>(
  val: T,
  {
    namespace,
    keys,
    keyMappings,
    labels,
    labelKeys,
    labelMappings,
  }: MetricsOptions<T>
) {
  const dynamicLabels: Record<string, any> = {};

  const allLabelKeys = new Set<keyof T>([
    ...(labelKeys ?? []),
    ...(Object.keys(labelMappings ?? {}) as Array<keyof T>),
  ]);
  allLabelKeys.forEach((key) => {
    const labelName = labelMappings?.[key] || key;
    dynamicLabels[labelName as string] = val[key];
  });
  const formattedLabels = formatPrometheusLabels({
    ...dynamicLabels,
    ...labels,
  });

  const keysSet = new Set([
    ...keys,
    ...(Object.keys(keyMappings ?? {}) as Array<keyof T>),
  ]);
  return Object.entries(val)
    .map(([key, value]) => {
      if (!keysSet.has(key as keyof T)) {
        return null;
      }
      if (value === null || value === undefined) {
        return null; // filter out null/undefined value not parsed by prometheus
      }
      const formattedKey = convertToPromMetricName(
        keyMappings?.[key as keyof T] || key,
        namespace
      );
      return `${formattedKey}\{${formattedLabels}\} ${value}`;
    })
    .filter(isPresent);
}

function convertToPromMetricName(value: string, prefix: string) {
  return `${prefix}_${snakeCase(value).replace("_h_", "h_")}`;
}

function formatPrometheusLabels(labels: object) {
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

export function parseNumericValue(value: string) {
  return new BigNumber(value.replace(/[^0-9\.-]+/g, "")).toString();
}

export async function puppeteerLaunch() {
  return await puppeteer.launch({
    headless: process.env.NODE_ENV === "production",
    args:
      process.env.PUPPETEER_DOCKER === "true"
        ? [
            // Required for Docker version of Puppeteer
            "--no-sandbox",
            "--disable-setuid-sandbox",
            // This will write shared memory files into /tmp instead of /dev/shm,
            // because Docker’s default for /dev/shm is 64MB
            "--disable-dev-shm-usage",
          ]
        : undefined,
    defaultViewport: {
      width: 1200,
      height: 900,
      // deviceScaleFactor: 1,
    },
  });
}
