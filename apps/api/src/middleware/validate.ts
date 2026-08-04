import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny, infer as zInfer } from "zod";

/**
 * Validate & coerce req.body against a Zod schema. Replaces req.body with the
 * parsed result so handlers get typed, trusted data. Throws ZodError (handled
 * centrally) on failure.
 */
export function validate<S extends ZodTypeAny>(schema: S) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body) as zInfer<S>;
    next();
  };
}
