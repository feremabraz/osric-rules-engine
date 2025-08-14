# OSRIC Rules Implementation Roadmap (Mechanics-First)

Purpose: Establish a mechanics specification (no code) for each tabletop OSRIC rule we intend to (re)implement in the redesigned Engine. Each markdown file describes pure values, flow, and dependencies—free of legacy implementation details. Files are ordered by game importance and dependency. Each rule spec assumes all previous specs are already implemented.

Ordering Principles:
1. Character Creation Core (abilities, race/class constraints) – foundation for all play.
2. Progression & Experience – level gating affects saves, combat, spells.
3. Core Resolution (saving throws, hit points degeneration, rests) – survival loop.
4. Status & Condition Ticks – ongoing world simulation.
5. Economy, Treasure, Reaction, Morale – encounter pacing & campaign loop.
6. Specialized Subsystems (turn undead, thief skills, special abilities, spellcasting nuances).
7. NPC / Monster behavioral logic & generation aids.
8. Peripheral / optional subsystems.

Notation:
- Dice: `XdY+Z` notation or best-of expressions (e.g. `4d6 drop lowest`).
- Ranges shown inclusive unless stated otherwise.
- Saving throw numbers are target numbers on d20 (roll >= target succeeds) unless specified.
- Modifiers: `+` lowers required target in OSRIC context if using descending target notation; here we list as bonuses applied before final target clamp.
- Advantage-like wording avoided; use explicit numeric modifiers.

Each rule file sections:
- Summary
- Inputs (parameters, contextual state)
- Outputs (state changes, produced values)
- Tables / Values
- Procedure (ordered algorithm in prose)
- Edge Cases
- Future Extensions (optional)

See subsequent files for specifications.
