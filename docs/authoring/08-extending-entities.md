# 8. Extending Entities

Currently the catalog is static. To add new races/classes locally:
1. Add new meta objects to `entities/character.ts` (follow existing immutable pattern).
2. Update corresponding Zod enums (`CharacterRaceMetaSchema`, `CharacterClassMetaSchema`).
3. Export via `character` object.
4. Adjust `prepare` logic if defaults should differ.

For new entity types (e.g. Spell):
- Create `entities/spell.ts` with draft + prepare + schema.
- Add branded IDs in `store/ids.ts`.
- Extend `StoreFacade` types & implementation with new maps and dispatch clauses.
- Re-export through `engine.entities` in `Engine` constructor file.

Keep changes minimal and consistent; prefer small PRs per entity addition.

Next: Registry & Auto-Discovery Internals (9).
