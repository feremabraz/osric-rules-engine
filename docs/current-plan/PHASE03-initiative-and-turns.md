# Phase 03 – Initiative & Turn Structure

Goal: Elevate initiative scaffold into full round/turn ordering enabling sequential execution of combat commands while maintaining deterministic replay capability, integrating with existing engine `events.trace` instrumentation (durations) and extending it for battle-specific logs later.

## Item 1: Round & Time Model Constants
Purpose: Define canonical time units.
Dependencies: Prior phases.
Specification:
- Constant `ROUND_SECONDS = 60` (classic OSRIC turn = 10 minutes; round ~ 1 minute; clarify: choose 60s for round, 600s for turn). Export in `types/temporal.ts`.
- Add `round: number` & `timeSeconds: number` to a new `BattleState` structure stored in store (isolated from global non-combat state).
Acceptance: New battle starts at round 1, timeSeconds 0.

## Item 2: Battle Initialization Command
Purpose: Create `startBattle` command establishing a `BattleState` with participants.
Dependencies: Item 1; character entities.
Specification:
- Params: `{ participants: CharacterId[] }`.
- Rules:
  1. Validate participants exist & alive.
  2. Roll initiative for each: `d6 + initiativeBase` (classic variant) store sorted descending (higher acts earlier).
  3. Persist `BattleState` entry with ordered queue and `activeIndex=0`.
- Result: `{ battleId, order: { id, rolled }[] }`.
Acceptance: Same seed => same ordering.

## Item 3: Turn Advancement Command
Purpose: Command `nextTurn` advancing initiative pointer, incrementing round after wrap.
Dependencies: Item 2.
Specification:
- Params: `{ battleId }`.
- Rules:
  1. Load battle; if not found error `BATTLE_NOT_FOUND`.
  2. Increment `activeIndex`; if exceeds length reset to 0 and increment `round` + `timeSeconds += ROUND_SECONDS`.
  3. Return `{ activeCombatant: CharacterId; round; timeSeconds }`.
Acceptance: After N steps cycles properly.

## Item 4: Initiative Re-Roll / Dynamic Adjustment
Purpose: Allow commands (spells, effects) to trigger initiative re-roll at new round start.
Dependencies: Item 3.
Specification:
- Add optional flag on `nextTurn` params `{ rerollAtNewRound?: boolean }`.
- On wrap and flag true: re-roll all initiative values using same formula; reorder; set `activeIndex=0`.
Acceptance: With flag set ordering changes based on new rolls.

## Item 5: Battle Snapshot Utility
Purpose: Provide introspection for UI/testing.
Dependencies: Items 2–4.
Specification:
- `getBattleSnapshot(battleId)` returning `{ round, timeSeconds, order:[{id, rolled}], active: CharacterId }`.
- Frozen return object.
Acceptance: Immutable across reads until state changes.

## Item 6: Integration with Attack/Damage Commands
Purpose: Ensure combat commands can reference active combatant automatically.
Dependencies: Items 2–5; Phase 02 commands.
Specification:
- Overload `attackRoll` params: if `attacker` omitted and `battleId` provided, it uses current active combatant.
- Validate that attacker matches active combatant when both provided.
- Add optional `battleId` field in params schemas (does not alter existing tests; add new tests).
Acceptance: Attack without specifying attacker inside battle uses active combatant.

## Item 7: Deterministic Replay Hook
Purpose: Allow capturing the RNG sequence for debugging.
Dependencies: RNG adapter.
Specification:
- Add optional `recordRolls` flag to battle start; if true maintain array of `{ type:'init'|'attack'|'damage', value:number; state:number }` per battle (include RNG internal state from `rng.getState()` after each roll) to guarantee replay reproducibility.
- Expose via snapshot.
Acceptance: Sequence length increments after each roll.

## Out-of-Scope
- Multi-encounter management.
- Delays, readied actions.
- Effects altering initiative mid-round.
