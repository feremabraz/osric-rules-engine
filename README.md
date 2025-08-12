# OSRIC Rules Engine

OSRIC, short for Old School Reference and Index Compilation, is a fantasy role-playing game system and a remake of the 1st edition of Advanced Dungeons & Dragons (AD&D).

![Preview](README.webp)

## Concepts

- Entities
	- State of the domain: Characters, Monsters, Items, Spells.
	- Stored in `GameContext`. Mutable when rules apply effects.

- Commands
	- User intents (e.g., `ATTACK`, `MOVE`, `CAST_SPELL`).
	- They validate parameters, look up entities, set internal context, and hand off to the engine.
	- There are no mechanics inside them.

- Rules
	- Mechanics, single-responsibility.
	- They implement `canApply(context, command)` and `apply()`; have a name (in `RULE_NAMES`) and a priority.
	- Read/write:
		- Internal context via `ContextKeys` (temporary data, scratchpad for the flow).
		- Entities via `GameContext.setEntity` when state changes are required.

- Chains
	- Wiring of rules: which rules, in what order, per command type.
	- It’s just the assembly point (not a rule, not a mechanic).
	- `osric/chains/*` holds small builder functions (e.g., `buildAttackChain`) and a registrar (`registerRuleChains`).

- RuleEngine and RuleChain
	- `RuleEngine` maps a command type to a `RuleChain` and executes it.
	- `RuleChain` is an ordered list of rules with execution policies (stop on failure, merge results, etc.).
	- `RuleContractValidator` statically checks that registered chains contain the rules each command requires.
