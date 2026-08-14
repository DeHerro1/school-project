import type { Role } from "@repo/shared";
import { prisma } from "./prisma";
import { supabaseAdmin } from "./supabase";
import { AppError } from "../middleware/error";

export interface ProvisionUserInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: Role;
  username?: string | null;
}

/**
 * The single place that creates a "user" for this app — every signup path
 * (parent self-registration, admin-created staff/parent accounts) must go
 * through this so the two systems (Supabase Auth + the Prisma `User`
 * profile) never desync: a Supabase Auth account without a matching Prisma
 * row (or vice versa) breaks login / `authGuard` lookups.
 *
 * There's no cross-system transaction, so on a Prisma failure we roll back
 * the just-created Supabase Auth user (best-effort — log loudly if even that
 * cleanup fails, since it leaves an orphaned Auth account).
 */
export async function provisionUser(input: ProvisionUserInput) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true, // no email-confirmation round trip needed for this project
  });
  if (error || !data.user) {
    throw new AppError(400, error?.message ?? "Could not create account");
  }

  try {
    const user = await prisma.user.create({
      data: {
        id: data.user.id,
        email: input.email,
        username: input.username || null,
        name: input.name,
        phone: input.phone,
        role: input.role,
      },
    });
    return user;
  } catch (err) {
    const { error: cleanupError } = await supabaseAdmin.auth.admin.deleteUser(data.user.id);
    if (cleanupError) {
      console.error(
        `provisionUser: failed to roll back orphaned Supabase Auth user ${data.user.id} after Prisma insert failure`,
        cleanupError,
      );
    }
    throw err;
  }
}
