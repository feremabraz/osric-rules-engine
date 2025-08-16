// CE-11 Simulation & Diff logic
// Provides diffing utilities over plain store snapshots. Snapshots are assumed
// to be JSON-like plain objects. Diff heuristic focuses on arrays of objects
// containing an `id` field (string | number). We classify created, deleted, mutated.

interface Identifiable {
  id: string | number;
}

export interface SimulationDiff {
  created: Array<{ collection: string; id: string | number }>;
  deleted: Array<{ collection: string; id: string | number }>;
  mutated: Array<{ collection: string; id: string | number }>;
}

export function diffSnapshots(before: unknown, after: unknown): SimulationDiff {
  const diff: SimulationDiff = { created: [], deleted: [], mutated: [] };
  if (!isPlainObject(before) || !isPlainObject(after)) return diff;
  const beforeObj = before as Record<string, unknown>;
  const afterObj = after as Record<string, unknown>;
  const collections = new Set<string>([...Object.keys(beforeObj), ...Object.keys(afterObj)]);
  for (const key of collections) {
    const a = beforeObj[key];
    const b = afterObj[key];
    if (!Array.isArray(a) && !Array.isArray(b)) continue; // only arrays considered
    const beforeArr = Array.isArray(a) ? a : [];
    const afterArr = Array.isArray(b) ? b : [];
    // Only arrays of plain objects with id considered
    const beforeMap = new Map<string | number, unknown>();
    for (const item of beforeArr) if (isIdentifiable(item)) beforeMap.set(item.id, item);
    const afterMap = new Map<string | number, unknown>();
    for (const item of afterArr) if (isIdentifiable(item)) afterMap.set(item.id, item);
    // Created
    for (const id of afterMap.keys())
      if (!beforeMap.has(id)) diff.created.push({ collection: key, id });
    // Deleted
    for (const id of beforeMap.keys())
      if (!afterMap.has(id)) diff.deleted.push({ collection: key, id });
    // Mutated (present in both, shallow JSON string differs)
    for (const id of afterMap.keys()) {
      if (beforeMap.has(id)) {
        const beforeJson = stableShallow(beforeMap.get(id) as object);
        const afterJson = stableShallow(afterMap.get(id) as object);
        if (beforeJson !== afterJson) diff.mutated.push({ collection: key, id });
      }
    }
  }
  return diff;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && (v as object).constructor === Object;
}

function isIdentifiable(v: unknown): v is Identifiable & Record<string, unknown> {
  return (
    isPlainObject(v) &&
    (typeof (v as Record<string, unknown>).id === 'string' ||
      typeof (v as Record<string, unknown>).id === 'number')
  );
}

function stableShallow(obj: object): string {
  const entries = Object.entries(obj)
    .filter(([k]) => k !== 'id')
    .sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(entries);
}
