import { z } from 'zod';

export interface MonsterDraft {
  name: string;
  level: number;
  hp: number;
}
export interface Monster extends MonsterDraft {
  id: string;
  createdAt: number;
  updatedAt: number;
}

export const MonsterDraftSchema: z.ZodType<MonsterDraft> = z.object({
  name: z.string().min(1),
  level: z.number().int().min(1),
  hp: z.number().int().min(1),
});

export function prepare(init: Partial<MonsterDraft>): MonsterDraft {
  const parsed = MonsterDraftSchema.parse({
    name: init.name ?? 'Monster',
    level: init.level ?? 1,
    hp: init.hp ?? 1,
  });
  return Object.freeze(parsed);
}

export const monster = Object.freeze({ prepare });
