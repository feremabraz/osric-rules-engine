# Post-Damage Status

Summary: Applies status changes after damage (bleeding, unconsciousness, death) and schedules ongoing effects.

Inputs:
- Target HP before and after damage
- Damage event metadata (source, type, critical)
- Current statuses

Outputs:
- Updated statuses: Bleeding, Unconscious, Dead
- Triggers for Bleeding Tick scheduler

Tables / Values:
- Unconscious threshold: HP <= 0.
- Bleeding: HP < 0 and > -10 (adds Bleeding status).
- Death: HP <= -10 immediate Dead status (unless optional stabilization rule active).
- Bleeding loss: 1 HP per round until -10 (Bleeding Tick rule executes).

Procedure:
1. Evaluate new HP.
2. If <= -10: add Dead (remove Bleeding if present); end processing.
3. If < 0: ensure Bleeding present; mark Unconscious.
4. If == 0: Unconscious (stabilization possible via separate rule) remove Bleeding if not <0.
5. If >0: no change (unless removing previous Bleeding when healed >=1).
6. Schedule or cancel Bleeding Tick as needed.
7. Output status deltas.

Edge Cases:
- Instant death effects bypass thresholds (flag to skip intermediate statuses).
- Stabilization mechanic (future) halts bleeding at negative HP.

Future Extensions:
- Death saves subsystem variant.
