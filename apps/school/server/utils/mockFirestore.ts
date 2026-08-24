// A tiny, file-persisted stand-in for the Firestore Admin SDK — used for
// local dev instead of the (Java-requiring) Firestore emulator. It
// implements exactly the subset of the Admin SDK's surface this app's
// server/api/** routes call (collection/doc/where/orderBy/limit/select/
// count/add/set/update/delete/getAll/batch), nothing more.
//
// Plain module (no Nitro auto-imports) so it can be imported both from the
// Nitro server (server/utils/firebase.ts) and from the standalone seed
// script (server/scripts/seed.ts).
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

type Op = "==" | "in";
interface WhereClause {
  field: string;
  op: Op;
  value: unknown;
}
type Row = { id: string; data: Record<string, unknown> };

class Store {
  private data: Record<string, Record<string, Record<string, unknown>>> = {};

  constructor(private file: string) {
    if (existsSync(file)) {
      try {
        this.data = JSON.parse(readFileSync(file, "utf-8"));
      } catch {
        this.data = {};
      }
    }
  }

  private col(name: string) {
    return (this.data[name] ??= {});
  }

  getDoc(col: string, id: string): Record<string, unknown> | undefined {
    return this.col(col)[id];
  }

  getAllDocs(col: string): Row[] {
    return Object.entries(this.col(col)).map(([id, data]) => ({ id, data }));
  }

  setDoc(col: string, id: string, data: Record<string, unknown>) {
    this.col(col)[id] = data;
    this.persist();
  }

  updateDoc(col: string, id: string, patch: Record<string, unknown>) {
    const existing = this.col(col)[id] ?? {};
    this.col(col)[id] = { ...existing, ...patch };
    this.persist();
  }

  deleteDoc(col: string, id: string) {
    delete this.col(col)[id];
    this.persist();
  }

  newId(): string {
    return randomUUID().replace(/-/g, "");
  }

  persist() {
    mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(this.file, JSON.stringify(this.data, null, 2));
  }
}

class DocumentReference {
  constructor(
    private store: Store,
    public collectionId: string,
    public id: string,
  ) {}
  async get() {
    return new DocumentSnapshot(this.id, this.store.getDoc(this.collectionId, this.id), this);
  }
  async set(data: Record<string, unknown>) {
    this.store.setDoc(this.collectionId, this.id, { ...data });
  }
  async update(patch: Record<string, unknown>) {
    this.store.updateDoc(this.collectionId, this.id, patch);
  }
  async delete() {
    this.store.deleteDoc(this.collectionId, this.id);
  }
}

class DocumentSnapshot {
  constructor(
    public id: string,
    private _data: Record<string, unknown> | undefined,
    public ref: DocumentReference,
  ) {}
  get exists() {
    return this._data !== undefined;
  }
  data() {
    return this._data;
  }
}

class QuerySnapshot {
  constructor(public docs: DocumentSnapshot[]) {}
  get empty() {
    return this.docs.length === 0;
  }
}

class Query {
  protected wheres: WhereClause[] = [];
  protected orderField?: string;
  protected orderDir: "asc" | "desc" = "asc";
  protected limitN?: number;
  protected selectFields?: string[];

  constructor(
    protected store: Store,
    protected collectionId: string,
  ) {}

  private clone(): this {
    const q = Object.create(Object.getPrototypeOf(this));
    Object.assign(q, this);
    q.wheres = [...this.wheres];
    return q;
  }

  where(field: string, op: Op, value: unknown): this {
    const q = this.clone();
    q.wheres.push({ field, op, value });
    return q;
  }

  orderBy(field: string, dir: "asc" | "desc" = "asc"): this {
    const q = this.clone();
    q.orderField = field;
    q.orderDir = dir;
    return q;
  }

  limit(n: number): this {
    const q = this.clone();
    q.limitN = n;
    return q;
  }

  select(...fields: string[]): this {
    const q = this.clone();
    q.selectFields = fields;
    return q;
  }

  count() {
    return {
      get: async () => {
        const snap = await this.get();
        return { data: () => ({ count: snap.docs.length }) };
      },
    };
  }

  async get(): Promise<QuerySnapshot> {
    let rows = this.store.getAllDocs(this.collectionId);
    for (const w of this.wheres) {
      rows = rows.filter((r) => {
        const v = r.data[w.field];
        if (w.op === "==") return v === w.value;
        if (w.op === "in") return Array.isArray(w.value) && w.value.includes(v);
        return true;
      });
    }
    if (this.orderField) {
      const field = this.orderField;
      const dir = this.orderDir;
      rows = [...rows].sort((a, b) => {
        const av = a.data[field] as any;
        const bv = b.data[field] as any;
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return dir === "asc" ? cmp : -cmp;
      });
    }
    if (this.limitN !== undefined) rows = rows.slice(0, this.limitN);
    if (this.selectFields) {
      const fields = this.selectFields;
      rows = rows.map((r) => ({
        id: r.id,
        data: Object.fromEntries(fields.map((f) => [f, r.data[f]])),
      }));
    }
    return new QuerySnapshot(
      rows.map((r) => new DocumentSnapshot(r.id, r.data, new DocumentReference(this.store, this.collectionId, r.id))),
    );
  }
}

class CollectionReference extends Query {
  doc(id?: string): DocumentReference {
    return new DocumentReference(this.store, this.collectionId, id ?? this.store.newId());
  }
  async add(data: Record<string, unknown>): Promise<DocumentReference> {
    const ref = this.doc();
    await ref.set(data);
    return ref;
  }
}

class WriteBatch {
  private ops: Array<() => void> = [];
  constructor(private store: Store) {}
  set(ref: DocumentReference, data: Record<string, unknown>) {
    this.ops.push(() => this.store.setDoc(ref.collectionId, ref.id, { ...data }));
    return this;
  }
  update(ref: DocumentReference, patch: Record<string, unknown>) {
    this.ops.push(() => this.store.updateDoc(ref.collectionId, ref.id, patch));
    return this;
  }
  delete(ref: DocumentReference) {
    this.ops.push(() => this.store.deleteDoc(ref.collectionId, ref.id));
    return this;
  }
  async commit() {
    this.ops.forEach((op) => op());
  }
}

export class MockFirestore {
  private store: Store;
  constructor(file: string) {
    this.store = new Store(file);
  }
  collection(id: string): CollectionReference {
    return new CollectionReference(this.store, id);
  }
  async getAll(...refs: DocumentReference[]): Promise<DocumentSnapshot[]> {
    return Promise.all(refs.map((r) => r.get()));
  }
  batch(): WriteBatch {
    return new WriteBatch(this.store);
  }
}
