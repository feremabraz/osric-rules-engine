// Engine configuration schema (Phase 1 alignment)
import { z } from 'zod';

// Expanded configuration model per Library Design
export const EngineConfigSchema = z.object({
  seed: z.number().int().optional(),
  logging: z
    .object({
      level: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
    })
    .default({ level: 'info' }),
  features: z
    .object({
      morale: z.boolean().default(true),
      weather: z.boolean().default(true),
    })
    .default({}),
  adapters: z
    .object({
      rng: z.enum(['default', 'mersenne', 'xoroshiro']).default('default'),
      persistence: z.any().nullable().default(null),
    })
    .default({}),
  // Phase 06: auto command discovery toggle (default true per blueprint minimal boilerplate goal)
  autoDiscover: z.boolean().default(true),
});

export type EngineConfig = z.infer<typeof EngineConfigSchema>;

// Consumers pass partial which we immediately parse/expand.
export type EngineConfigInput = Partial<EngineConfig> | undefined;
