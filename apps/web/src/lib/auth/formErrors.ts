import type { z } from "zod";

/**
 * Shapes a zod error into one message per field (first issue wins per
 * field). Used both client-side (fast feedback before the network call)
 * and inside the Server Action (the real enforcement point) so the two
 * always agree on which field a given error belongs to.
 */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!(key in fieldErrors)) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}
