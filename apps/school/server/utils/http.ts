import type { H3Event } from "h3";
import { ZodError, type ZodTypeAny, type infer as zInfer } from "zod";

/**
 * Throw an API error carrying `{ error: message }` as its `data` payload —
 * mirrors what Express's errorHandler used to send as the whole response
 * body (`{ error: message }`). Nitro's own error envelope nests this one
 * level deeper on the wire (`{ error: true, data: { error: message }, ... }`),
 * so the client reads it back via `apiError()` (apps/school/app/composables/
 * useApi.ts), not `err.data.error` directly — see that function's comment.
 * Named differently from that client helper to avoid Nuxt's app/server
 * auto-import namespaces colliding on the same name.
 */
export function httpError(statusCode: number, message: string) {
  return createError({ statusCode, statusMessage: message, data: { error: message } });
}

/** Validate arbitrary data against a Zod schema. 422 with per-field issues on failure. */
export function parseOrThrow<S extends ZodTypeAny>(schema: S, data: unknown): zInfer<S> {
  try {
    return schema.parse(data);
  } catch (e) {
    if (e instanceof ZodError) {
      throw createError({
        statusCode: 422,
        statusMessage: "Validation failed",
        data: {
          error: "Validation failed",
          issues: e.issues.map((i: { path: (string | number)[]; message: string }) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
      });
    }
    throw e;
  }
}

/** Read + validate the JSON body against a Zod schema. 422 with per-field issues on failure. */
export async function validateBody<S extends ZodTypeAny>(
  event: H3Event,
  schema: S,
): Promise<zInfer<S>> {
  const body = await readBody(event).catch(() => ({}));
  return parseOrThrow(schema, body);
}
