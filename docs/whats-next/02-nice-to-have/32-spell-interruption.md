# Spell Interruption

Summary: Determines whether an in-progress spell is disrupted by damage or conditions before completion.

Inputs:
- Casting state (spell, segments remaining)
- Incoming event: damage (amount), forced movement, status effect (stun, silence), failed concentration check

Outputs:
- Interrupted flag (spell lost) or Continue
- Slot consumed? (yes if casting reaches completion; lost if interrupted mid-cast)
- Component loss (material components possibly expended on start or completion depending on policy)

Procedure:
1. On damage event during casting segments: require concentration check (e.g., roll d20 + CON or level vs DC = 10 + spell level) (placeholder mechanic—replace with OSRIC default: any damage = interruption unless special ability).
2. If check fails (or automatic interruption rule): mark spell lost; consume slot per policy.
3. If silence applied before completion to verbal spell: automatic interruption.
4. Grapple / pin may automatically interrupt somatic component spells.
5. On completion without further events: not interrupted.

Edge Cases:
- Multiple hits same segment: single check at worst circumstance.
- Non-damaging distractions (shove) may impose penalty.

Future Extensions:
- Feats/abilities granting casting continuity.
