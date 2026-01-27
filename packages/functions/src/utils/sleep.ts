/**
 * Sleep for a specified number of milliseconds
 *
 * @param ms - Milliseconds to sleep
 * @returns A promise that resolves after the specified time
 *
 * @example
 * ```ts
 * await sleep(1000); // Sleep for 1 second
 * ```
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sleep for a specified number of seconds
 *
 * @param seconds - Seconds to sleep
 * @returns A promise that resolves after the specified time
 *
 * @example
 * ```ts
 * await sleepSeconds(5); // Sleep for 5 seconds
 * ```
 */
export function sleepSeconds(seconds: number): Promise<void> {
  return sleep(seconds * 1000);
}
