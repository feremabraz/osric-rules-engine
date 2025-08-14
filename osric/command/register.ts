import { z } from 'zod';
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
}

export interface BuiltCommandMeta {
  key: string;
  paramsSchema: unknown;
  rules: BuiltRuleMeta[]; // original order (not yet topo-sorted)
  resultKeys: string[]; // aggregated from rule output schemas
  resultSchema?: z.ZodObject<Record<string, z.ZodTypeAny>>;
}

export function buildRegistry(): BuiltCommandMeta[] {
  const cmds = getRegisteredCommands();
  const keySet = new Set<string>();
  const built: BuiltCommandMeta[] = [];
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
      const schemaKeys = Object.keys(ruleCtor.output.shape);
      for (const k of schemaKeys) {
        if (!collectedResultKeys.includes(k)) collectedResultKeys.push(k);
      }
      outputSchemas.push(ruleCtor.output as z.ZodObject<Record<string, z.ZodTypeAny>>);
      ruleMetas.push({ ruleName: rn, after, ruleCtor });
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
    built.push({
      key: cmd.key,
      paramsSchema: cmd.params,
      rules: ruleMetas,
      resultKeys: collectedResultKeys,
      resultSchema: composite,
    });
  }
  return built;
}
