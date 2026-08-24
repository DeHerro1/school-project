// Firebase Auth's password sign-in only accepts an email, but staff sign in
// with a username (see app/pages/login.vue) — this resolves username -> email
// so the client can then call the Firebase client SDK's signInWithPassword
// directly. Ported from the username branch of apps/api/src/routes/auth.ts's
// POST /login (the sign-in itself now happens client-side against Firebase
// Auth, so there's no server-side password check left to do here).
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const username = typeof query.username === "string" ? query.username : "";
  if (!username) throw httpError(400, "username is required");

  const snap = await collections.users().where("username", "==", username).limit(1).get();
  if (snap.empty) throw httpError(401, "Invalid credentials");

  return { email: (snap.docs[0]!.data() as { email: string }).email };
});
