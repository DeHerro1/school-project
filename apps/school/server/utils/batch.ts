/** Firestore's `in` operator caps at 30 values — chunk larger id lists and merge results. */
export async function batchedIn<T>(
  ids: string[],
  run: (chunk: string[]) => Promise<T[]>,
): Promise<T[]> {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 30) chunks.push(ids.slice(i, i + 30));
  const results = await Promise.all(chunks.map(run));
  return results.flat();
}
