# Search & Detection

Summary: Resolves attempts to locate traps, secret doors, hidden objects.

Inputs:
- Target feature type (secret door, trap, concealed item)
- Searcher class, race (elves secret door bonus), level (thief skills), INT/WIS
- Time spent searching (rounds, turns)

Outputs:
- Found? (boolean)
- Time consumed

Tables / Values (Examples):
- Passive secret door detection (elves) 1-in-6 when passing.
- Active search: 2-in-6 per turn for secret doors; 1-in-6 for others; thief find traps uses percentile skill instead.
- Time per search attempt: 1 turn.

Procedure:
1. Determine detection method (passive vs active vs skill roll).
2. If passive: roll d6 vs threshold; on success reveal.
3. If active: consume time; roll vs chance; repeat if allowed.
4. Thief trap detection: roll percentile vs skill after modifiers.
5. On success reveal feature; else continue or terminate.

Edge Cases:
- Multiple characters searching: do not stack linear; allow one combined roll with +1 shift or additional attempts sequentially (time cost).
- Trap triggered on failed search if reckless (optional).

Future Extensions:
- Tool quality modifiers.
