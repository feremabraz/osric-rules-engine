import { z } from 'zod';
import { engineFail } from '../types/result';
import { hashStrings } from '../util/stableHash';
import type { CommandClass } from './Command';
import type { RuleClass } from './Rule';

const registered: CommandClass[] = [];

export function registerCommand(cmd: CommandClass): void {
  if (!registered.includes(cmd)) registered.push(cmd);
}

export function getRegisteredCommands(): CommandClass[] {
  return [...registered];
}

export function resetRegisteredCommands(): void {
  registered.length = 0;
}

export interface BuiltRuleMeta {
  ruleName: string;
  after: string[];
  ruleCtor: RuleClass;
  category: string;
}

export interface BuiltCommandMeta {
  key: string;
  paramsSchema: unknown;
  rules: BuiltRuleMeta[]; // original order (not yet topo-sorted)
  resultKeys: string[]; // aggregated from rule output schemas
  resultSchema?: z.ZodObject<Record<string, z.ZodTypeAny>>;
  digest: string; // structural digest (Item 14)
}

// Cached digests (recomputed on each buildRegistry call to reflect current registration set).
let lastDigests: { command: string; digest: string }[] = [];

/** Returns latest computed command digests (call after buildRegistry or any API that triggers it). */
export function getCommandDigests(): { command: string; digest: string }[] {
  return [...lastDigests];
}

export function buildRegistry(): BuiltCommandMeta[] {
  const cmds = getRegisteredCommands();
  const keySet = new Set<string>();
  const built: BuiltCommandMeta[] = [];
  const digests: { command: string; digest: string }[] = [];
  for (const cmd of cmds) {
    if (!cmd.key) throw new Error('Command missing static key');
    if (keySet.has(cmd.key)) throw new Error(`Duplicate command key: ${cmd.key}`);
    keySet.add(cmd.key);
    const ruleNameSet = new Set<string>();
    const ruleMetas: BuiltRuleMeta[] = [];
    const collectedResultKeys: string[] = [];
    // Accumulate required output schemas
    const outputSchemas: z.ZodObject<Record<string, z.ZodTypeAny>>[] = [];
    for (const ruleCtor of cmd.rules) {
      const rn = ruleCtor.ruleName;
      if (!rn) throw new Error(`Rule class missing static ruleName in command ${cmd.key}`);
      if (ruleNameSet.has(rn)) throw new Error(`Duplicate rule name '${rn}' in command ${cmd.key}`);
      ruleNameSet.add(rn);
      const after = ruleCtor.after ?? [];
      if (!ruleCtor.output)
        throw new Error(`Rule '${rn}' in command ${cmd.key} missing output schema`);
      // Category inference: explicit static category OR derived from ruleName prefix before first underscore/camel boundary.
      const explicitCategory = (ruleCtor as unknown as { category?: string }).category;
      let category = explicitCategory;
      if (!category) {
        // Infer: split camelCase transitions or underscores; take first token lowercased.
        const name = rn;
        const underscoreIdx = name.indexOf('_');
        const base =
          underscoreIdx !== -1
            ? name.slice(0, underscoreIdx)
            : name.replace(/([a-z])([A-Z])/g, '$1_$2').split('_')[0];
        category = base.toLowerCase();
      }
      const schemaKeys = Object.keys(ruleCtor.output.shape);
      for (const k of schemaKeys) {
        if (!collectedResultKeys.includes(k)) collectedResultKeys.push(k);
      }
      outputSchemas.push(ruleCtor.output as z.ZodObject<Record<string, z.ZodTypeAny>>);
      ruleMetas.push({ ruleName: rn, after, ruleCtor, category: category || 'uncategorized' });
    }
    // Validate dependencies
    for (const m of ruleMetas) {
      for (const dep of m.after) {
        if (!ruleNameSet.has(dep))
          throw new Error(`Rule '${m.ruleName}' depends on missing '${dep}' in command ${cmd.key}`);
      }
    }
    // Merge schemas if provided (fail on conflicting field types at dev time)
    let composite: z.ZodObject<Record<string, z.ZodTypeAny>> | undefined;
    if (outputSchemas.length) {
      const mergedShape: Record<string, z.ZodTypeAny> = {};
      for (const s of outputSchemas) {
        for (const [k, v] of Object.entries(s.shape)) {
          if (mergedShape[k]) {
            // Strict mode: any duplicate key (even identical schema) is a conflict.
            throw new Error(
              `CONFLICTING_RESULT_KEY: Duplicate result key '${k}' in command ${cmd.key}`
            );
          }
          mergedShape[k] = v;
        }
      }
      composite = z.object(mergedShape);
    }
    // Ordering enforcement (Item 11) categories pipeline: validate -> load -> calc -> mutate -> emit
    const orderSeq = ['validate', 'load', 'calc', 'mutate', 'emit'];
    const rank = (c: string) => {
      const idx = orderSeq.indexOf(c);
      return idx === -1 ? orderSeq.length : idx; // unknown categories float to end but allowed
    };
    let worst = -1;
    for (const m of ruleMetas) {
      const r = rank(m.category);
      if (r < worst) {
        const msg = `ORDERING_VIOLATION: Rule '${m.ruleName}' (category ${m.category}) appears after later-stage rule in command ${cmd.key}`;
        throw new Error(msg);
      }
      if (r > worst) worst = r;
    }
    // Build digest components: tuples [ruleName, category, sortedOutputKeysCSV]
    const tupleStrings: string[] = [];
    for (const rm of [...ruleMetas].sort((a, b) => a.ruleName.localeCompare(b.ruleName))) {
      const ruleOutput = (
        rm.ruleCtor as unknown as { output?: z.ZodObject<Record<string, z.ZodTypeAny>> }
      ).output;
      const keys = ruleOutput ? Object.keys(ruleOutput.shape).sort() : [];
      tupleStrings.push(`${rm.ruleName}|${rm.category}|${keys.join(',')}`);
    }
    const digest = hashStrings(tupleStrings);
    digests.push({ command: cmd.key, digest });
    built.push({
      key: cmd.key,
      paramsSchema: cmd.params,
      rules: ruleMetas,
      resultKeys: collectedResultKeys,
      resultSchema: composite,
      digest,
    });
  }
  lastDigests = digests;
  return built;
}
