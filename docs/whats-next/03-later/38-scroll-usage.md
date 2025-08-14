# Scroll Usage

Summary: Resolves casting a spell from a scroll (single-use magic item).

Inputs:
- Scroll item (spell name, level, caster level encoded)
- Reader class & level
- Conditions (silence, blindness)

Outputs:
- Casting success/failure
- Spell effect (delegated to Spell Effects)
- Scroll consumed or persistence (if multi-charge variant)

Procedure:
1. Verify reader class can use scroll (class list). If not, chance of mishap (roll vs failure table) — consult OSRIC for exact percentages.
2. Check readability (Read Magic requirement if not previously deciphered).
3. If requirements met: treat as Spell Casting with casting time = 1 segment unless scroll states otherwise; no slot cost.
4. On success consume scroll (destroy) unless multi-charge; decrement charges.
5. On mishap: roll effect (backfire, miscast, summoning, item destruction).

Edge Cases:
- Higher-level spell than user could normally cast: allowed via scroll but with mishap chance (per OSRIC guidelines).
- Partial deciphering invalid: treat as wrong class attempt.

Future Extensions:
- Scroll preservation for collection (non-consumed on cast variant).
