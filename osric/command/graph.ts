import { buildRegistry } from './register';

/**
 * Item 13: Rule Dependency Visualization
 * Builds a simple directed graph (dependency edges) for the rules of the specified command.
 * Output is JSON-friendly and stable (nodes / edges sorted) for snapshot testing & tooling.
 */
export interface RuleGraphEdge {
  from: string; // dependency rule name
  to: string; // dependent rule name
  type: 'depends';
}

export interface RuleGraphExplanation {
  command: string;
  nodes: string[]; // rule names
  edges: RuleGraphEdge[]; // dependency edges
  topoOrder: string[]; // topologically sorted rule execution order (as declared / respecting deps)
  cycles?: string[][]; // any detected cycles (each is ordered list of rule names)
}

export function explainRuleGraph(commandKey: string): RuleGraphExplanation {
  const reg = buildRegistry();
  const meta = reg.find((m) => m.key === commandKey);
  if (!meta) throw new Error(`explainRuleGraph: command '${commandKey}' not found`);
  const nodes = meta.rules.map((r) => r.ruleName);
  // Build edges from dependencies
  const edges: RuleGraphEdge[] = [];
  for (const r of meta.rules) {
    for (const dep of r.after) {
      edges.push({ from: dep, to: r.ruleName, type: 'depends' });
    }
  }
  // Sort for stability
  edges.sort((a, b) =>
    a.from === b.from ? a.to.localeCompare(b.to) : a.from.localeCompare(b.from)
  );
  nodes.sort();
  // Detect cycles & produce topo order via DFS / Kahn hybrid
  const adj = new Map<string, Set<string>>();
  const indeg = new Map<string, number>();
  for (const n of nodes) {
    adj.set(n, new Set());
    indeg.set(n, 0);
  }
  for (const e of edges) {
    if (!adj.has(e.from)) adj.set(e.from, new Set());
    const set = adj.get(e.from);
    if (set) set.add(e.to);
    indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
    if (!indeg.has(e.from)) indeg.set(e.from, 0);
  }
  const queue: string[] = [];
  for (const [n, d] of indeg) if (d === 0) queue.push(n);
  queue.sort();
  const topo: string[] = [];
  while (queue.length) {
    const n = queue.shift();
    if (!n) break;
    topo.push(n);
    for (const nxt of adj.get(n) ?? []) {
      indeg.set(nxt, (indeg.get(nxt) ?? 0) - 1);
      if ((indeg.get(nxt) ?? 0) === 0) {
        queue.push(nxt);
        queue.sort();
      }
    }
  }
  let cycles: string[][] | undefined;
  if (topo.length !== nodes.length) {
    // Cycle(s) exist – perform DFS back-edge collection
    cycles = [];
    const temp = new Set<string>();
    const perm = new Set<string>();
    const path: string[] = [];
    const visit = (n: string) => {
      if (perm.has(n)) return;
      if (temp.has(n)) {
        const idx = path.indexOf(n);
        if (idx >= 0 && cycles) cycles.push(path.slice(idx));
        return;
      }
      temp.add(n);
      path.push(n);
      for (const nxt of adj.get(n) ?? []) visit(nxt);
      path.pop();
      temp.delete(n);
      perm.add(n);
    };
    for (const n of nodes) visit(n);
  }
  const base: RuleGraphExplanation = { command: commandKey, nodes, edges, topoOrder: topo };
  if (cycles && cycles.length > 0) {
    base.cycles = cycles;
  }
  return base;
}
