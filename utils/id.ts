/**
 * utils/id.ts
 *
 * Simple unique ID generator for notes and todos.
 *
 * Why not use the 'uuid' package?
 *   Thoughts is a local-only app — IDs never need to be globally unique across
 *   devices or servers. A timestamp + random suffix is collision-proof in practice
 *   for a single-user app, and avoids an extra dependency.
 *
 * Format: "<base36 timestamp>-<random alphanumeric string>"
 * Example: "lwz4kxg2-a3f8k2m"
 *
 * DEBUG TIP: If two notes appear to share the same ID, check whether
 * generateId() was called in a tight synchronous loop (same millisecond).
 * In practice this won't happen in user interaction code.
 */

/**
 * generateId — produces a unique string suitable for use as a Note or Todo id.
 * Includes the current timestamp in base-36 to make IDs time-sortable when needed.
 */
export function generateId(): string {
  // Date.now() in base-36 → shorter than decimal representation
  const timestamp = Date.now().toString(36);
  // 7 random characters from Math.random base-36
  const random = Math.random().toString(36).slice(2, 9);
  return `${timestamp}-${random}`;
}
