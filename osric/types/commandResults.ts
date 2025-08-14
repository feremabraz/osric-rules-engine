// Phase 1 (Step 4/5): Typed command result aggregation surface
// The base interface is intentionally empty; each command file augments it via
//   declare global { interface CommandResultShape { myCommand: { ... } } }
// allowing incremental, localized typing without a central manifest.
// Engine then uses keyof CommandResultShape for typed execute()/proxy methods.
// Future phases will refine value types (currently mostly unknown) once rule
// output schemas are introduced.

// Automatic inference: import known commands and map their keys to inferred result types.
// This replaces manual per-command interface augmentation.
import type { CreateCharacterCommand } from '../commands/createCharacter';
import type { GainExperienceCommand } from '../commands/gainExperience';
import type { InspirePartyCommand } from '../commands/inspireParty';
import type { CommandResultFrom } from './inferResults';

export interface CommandResultShape {
  createCharacter: CommandResultFrom<typeof CreateCharacterCommand>;
  gainExperience: CommandResultFrom<typeof GainExperienceCommand>;
  inspireParty: CommandResultFrom<typeof InspirePartyCommand>;
  // Fallback for any future un-mapped commands (discouraged, will be refined when added here)
  [commandKey: string]: unknown;
}

// Convenience specific result types (library design clarity section):
export type CreateCharacterResult = CommandResultShape['createCharacter'];
export type GainExperienceResult = CommandResultShape['gainExperience'];
export type InspirePartyResult = CommandResultShape['inspireParty'];

// Phase 02: helper types for deriving concrete result types from merged Zod schemas.
// (Runtime still stores composite schema on BuiltCommandMeta; compile-time derivation happens via declaration merging in command modules.)
import type { ZodObject, ZodRawShape, ZodTypeAny } from 'zod';
import type { Command } from '../command/Command';
// (CommandResultFrom imported above)
export type InferZodObject<T> = T extends ZodObject<infer Shape extends ZodRawShape>
  ? { [K in keyof Shape]: Shape[K] extends ZodTypeAny ? import('zod').infer<Shape[K]> : unknown }
  : never;

// Experimental: infer result shape directly from a Command subclass's static rules (if present)
export type InferCommandResult<C> = C extends typeof Command
  ? CommandResultFrom<C>
  : Record<string, unknown>;

export type CommandKey = keyof CommandResultShape & string;
