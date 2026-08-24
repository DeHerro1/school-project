import type { H3Event } from "h3";
import { ZodError, type ZodTypeAny, type infer as zInfer } from "zod";

/**
 * Throw an API error shaped so `apiError()` (apps/school/app/composables/useApi.ts)
 * keeps working unchanged on the client — it reads `err.data.error`, exactly
 * what Express's errorHandler used to send as `{ error: message }`. Named
 * differently from that client helper to avoid Nuxt's app/server auto-import
 * namespaces colliding on the same name.
 */
export function httpError(statusCode: number, message: string) {
  return createError({ statusCode, statusMessage: message, data: { error: message } });
}

/** Read + validate the JSON body against a Zod schema. 422 with per-field issues on failure. */
export async function validateBody<S extends ZodTypeAny>(
  event: H3Event,
  schema: S,
): Promise<zInfer<S>> {
  const body = await readBody(event).catch(() => ({}));
  try {
    return schema.parse(body);
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
