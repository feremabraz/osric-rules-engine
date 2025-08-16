# 10. Graph Snapshot

Think of the rule‑graph snapshot as freezing your “mini OSRIC procedure” per command, analogous to locking down the canonical AD&D/OSRIC sequence (e.g. Surprise → Initiative → Declarations → Movement → Missiles → Spells → Melee → Morale). For each engine command (attackRoll, dealDamage, nextTurn, etc.) you currently have an internal micro‑ordering of rules (validation, modifier aggregation, roll, crit resolution, assembly). 

The snapshot captures:

- Which procedural sub‑steps exist (nodes = your internal phases).
- The enforced before/after relations (edges = “this must occur prior to that”).
- The final linear execution order (topoOrder = your localized turn/attack sequence).
- Presence/absence of cycles (should stay empty—just like you must not loop back to “declare spells” after rolling damage).

In OSRIC terms:

- attackRoll graph = (Validate combatants) → (Compute to‑hit adjustments: weapon vs AC, STR, magic) → (Roll d20) → (Crit handling) → (Assemble result). Snapshot ensures no accidental swap like resolving crit before the actual hit roll.
- dealDamage graph would parallel Post‑Hit: (Validate) → (Base weapon dice) → (Apply STR, magic, situational) → (Apply multipliers) → (Apply HP & death/unconscious logic) → (Emit effects & morale triggers). Changing death logic position would surface as a diff.
- nextTurn graph captures initiative / active combatant rotation and scheduled morale checks (mirrors OSRIC end‑of‑round housekeeping).

Why is useful:

1. Guards RAW adherence: If you later introduce, say, a “Damage Resistance” rule it must slot after raw dice, before multipliers—snapshot diff demands you consciously accept that insertion.
2. Prevents silent drift: Refactors can’t quietly reorder modifiers (avoiding subtle math bugs).
3. Documents engine phase model in code (living spec akin to printed OSRIC combat sequence chart).

How many do we need:

Only snapshot the commands whose internal sequence embodies meaningful OSRIC procedural logic (attackRoll, dealDamage, nextTurn, maybe savingThrow if it gains multi‑step modifiers). That keeps noise low while protecting core procedure fidelity.

Implementation Note:

Use `explainRuleGraph(commandKey)` to obtain a stable JSON description (`rules`, `edges`, `topoOrder`). Commit snapshot files in tests; diffs require explicit acceptance, preventing unnoticed ordering drift. See also structural contracts doc (`12-structural-contracts.md`) for digest pairing.
