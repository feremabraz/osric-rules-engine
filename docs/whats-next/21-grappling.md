# Grappling

Summary: Handles attempt to grapple (wrestle) an opponent: initiation, contested resolution, and effects.

Inputs:
- Attacker STR, DEX, size category, level/HD
- Defender STR, DEX, size category, level/HD
- Situational modifiers (prone, restraints, surprise)

Outputs:
- Grapple success/failure
- Control status (attacker, defender, neutral)
- Ongoing escape DC/target numbers and damage each round (if any)

Tables / Values:
- Size modifiers: Larger creature gains bonus, smaller penalty (e.g., +/-4 per size step difference) – verify OSRIC specifics.
- Strength comparison table (see Strength Comparison spec) influences initial roll modifiers.

Procedure:
1. Initiation: Attacker declares grapple instead of normal attack; may require successful hit vs modified AC (touch) baseline.
2. If hit, resolve opposed check (d20 + STR mod + size mod + level/HD factor) vs defender check.
3. Higher total gains control; tie = stalemate.
4. On control: options each round (pin, damage small amount, move both, disarm) resolved via subsequent opposed checks.
5. Defender may attempt escape on turn using opposed check.

Edge Cases:
- Multiple attackers grappling one target: provide cumulative bonuses after first participant.
- Creatures immune (incorporeal, amorphous) automatically resist.

Future Extensions:
- Detailed pin/lock escalation ladder.
