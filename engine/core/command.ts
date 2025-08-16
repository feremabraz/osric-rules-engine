// CE-05 Command Descriptor
// Minimal descriptor structure; populated later via DSL (CE-06). For now used directly in tests.

export type RuleFn<Params = unknown, Acc = unknown, Ctx = unknown, R = unknown> = (
  acc: Acc,
  params: Params,
  ctx: Ctx
) => R;

export interface CommandStages {
  validate: RuleFn[];
  load: RuleFn[];
  calc: RuleFn[];
  mutate: RuleFn[];
  emit: RuleFn[];
}

export interface CommandDescriptor {
  key: string;
  stages: CommandStages;
}

export function makeCommandDescriptor(
  key: string,
  stages?: Partial<CommandStages>
): CommandDescriptor {
  const full: CommandStages = {
    validate: stages?.validate ? [...stages.validate] : [],
    load: stages?.load ? [...stages.load] : [],
    calc: stages?.calc ? [...stages.calc] : [],
    mutate: stages?.mutate ? [...stages.mutate] : [],
    emit: stages?.emit ? [...stages.emit] : [],
  };
  const descriptor: CommandDescriptor = { key, stages: full };
  return Object.freeze(descriptor);
}

export function totalRuleCount(d: CommandDescriptor): number {
  const s = d.stages;
  return s.validate.length + s.load.length + s.calc.length + s.mutate.length + s.emit.length;
}
