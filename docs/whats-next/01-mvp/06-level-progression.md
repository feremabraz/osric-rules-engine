# Level Progression

Summary: Provides XP thresholds per class and effects of leveling (hit points, saves, attack matrices, spell slots, ability progression).

Inputs:
- Class (or each class in multi-class)
- Current experience points
- Previous level state (for delta computations)

Outputs:
- New level (per class)
- Excess XP (carry to next threshold)
- Gained hit points (rolled or fixed per class HD progression with CON adjustments & high-level fixed increments)
- Adjusted saving throws (reference) and attack progression index
- Spell slot table row (if caster)

Tables / Values:
- XP Threshold table per class levels 1–20.
- Hit Die per class (e.g., Fighter d10, Cleric d8, Magic-User d4, Thief d6; confirm OSRIC specifics) with high-level fixed HP additions.
- Maximum HP gain per level optional rule (ignore unless enabled—future feature flag).

Procedure:
1. Determine current level by finding highest threshold <= XP.
2. If level > previous level: for each gained level sequentially:
   a. Roll (or allocate) hit die; add CON bonus per level guidelines (may cap at +2/+3 etc. depending on class & constitution).
   b. Update saving throw table reference.
   c. Update attack matrix index.
   d. Update spell slots if applicable.
3. Aggregate total HP gained and other deltas.
4. Output final level info.

Edge Cases:
- Multi-class: XP divided among classes; each class advances independently.
- Level cap (race/class) stops further progression; excess XP tracked.
- Minimum HP per level (if variant rule) not included here.

Future Extensions:
- Training time & cost gating separate rule.
