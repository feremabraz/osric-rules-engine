
## Command audit (thinness and delegation)

Legend: [x] thin and delegates; [~] thin but prepares-only (missing engine delegation); [ ] contains mechanics

- Character
  - [x] SavingThrowCommand — thin; publishes `SAVING_THROW_PARAMS`; delegates
  - [x] ThiefSkillCheckCommand — thin; publishes `THIEF_SKILL_PARAMS`; delegates
  - [x] TurnUndeadCommand — thin; publishes `TURN_UNDEAD_PARAMS`; delegates
  - [x] CreateCharacterCommand — thin; sets creation params/context; no mechanics (uses Dice for id only)
  - [x] GainExperienceCommand — thin; publishes `CHARACTER_EXPERIENCE_GAIN_PARAMS`; delegates
  - [x] LevelUpCommand — thin; publishes level-up request; delegates

- Exploration
  - [x] MoveCommand — thin; publishes `EXPLORATION_MOVEMENT_REQUEST_PARAMS`; delegates
  - [x] SearchCommand — thin; publishes search context/params; delegates
  - [x] FallingDamageCommand — thin; publishes `EXPLORATION_FALLING_DAMAGE_PARAMS`; delegates
  - [x] WeatherCheckCommand — thin; delegates to weather effects
  - [x] TerrainNavigationCommand — thin; publishes params; delegates via RuleEngine
  - [x] ForagingCommand — thin; publishes params; delegates via RuleEngine

- Combat
  - [x] AttackCommand — thin; publishes `COMBAT_ATTACK_CONTEXT`; delegates via RuleEngine
  - [x] GrappleCommand — thin; publishes `COMBAT_GRAPPLE_CONTEXT`; delegates via RuleEngine
  - [x] InitiativeCommand — thin; publishes `COMBAT_INITIATIVE_CONTEXT`; delegates via RuleEngine

- Spells
  - [x] CastSpellCommand — thin; sets spell cast context; delegates via RuleEngine
  - [x] MemorizeSpellCommand — thin; sets spell context; delegates via RuleEngine
  - [x] IdentifyMagicItemCommand — thin; sets identify context; delegates via RuleEngine; uses RULE_NAMES
  - [x] ScrollReadCommand — thin; sets scroll context; delegates via RuleEngine; uses RULE_NAMES
  - [x] MagicItemCreationCommand — thin; publishes params; delegates via RuleEngine (mechanics migrated to rules/chain)
  - [x] SpellResearchCommand — thin; publishes request; delegates

- NPC / System
  - [x] ReactionRollCommand — thin; publishes params; delegates via RuleEngine
  - [x] MonsterGenerationCommand — thin; publishes params; delegates via RuleEngine
  - [x] RoundTickCommand — thin; delegates to round-tick chain

Follow-ups
- Commands: none pending — previously [~]/[ ] items addressed.

## Rule files audit (one file = one rule)

Legend: [x] compliant (single exported rule class) • [!] multi-export (split needed) • [dup] potential duplicate classes across files

- Character
  - [!] character/AbilityScoreGenerationRules.ts — multiple classes (includes ExceptionalStrengthRules, RacialAbilityAdjustmentRules) [dup: also in character/RacialAbilityAdjustmentRules.ts]
  - [x] character/SavingThrowRules.ts
  - [x] character/RacialRestrictionsRules.ts
  - [x] character/ClassRequirementRules.ts
  - [x] character/CharacterInitializationRules.ts
  - [x] character/StartingEquipmentRule.ts
  - [x] character/ThiefSkillRules.ts
  - [x] character/TurnUndeadRules.ts

- Experience
  - [x] experience/LevelProgressionRules.ts
  - [x] experience/TrainingRules.ts
  - [x] experience/ExperienceGainRules.ts

- Exploration
  - [x] exploration/FallingDamageRules.ts
  - [x] exploration/MovementRateRules.ts
  - [x] exploration/EncumbranceRules.ts
  - [x] exploration/MovementRules.ts
  - [x] exploration/SearchRules.ts
  - [x] exploration/VisibilityRules.ts
  - [x] exploration/SurvivalChecksRules.ts
  - [x] exploration/TemperatureEffectsRules.ts
  - [x] exploration/ForagingRules.ts
  - [x] exploration/TerrainNavigationRules.ts
  - [x] exploration/WeatherEffectRules.ts
  - [x] exploration/DrowningRules.ts

- Combat
  - [!] combat/InitiativeRules.ts — multiple classes (InitiativeRoll, SurpriseCheck, InitiativeOrder) [dup: SurpriseCheckRules.ts, InitiativeOrderRules.ts exist]
  - [x] combat/InitiativeOrderRules.ts
  - [x] combat/SurpriseCheckRules.ts
  - [x] combat/AttackRollRules.ts
  - [x] combat/DamageCalculationRules.ts
  - [x] combat/ApplyDamageRules.ts
  - [x] combat/PostDamageStatusRules.ts
  - [!] combat/MultipleAttackRules.ts — multiple classes (MultipleAttack, AttackPrecedence)
  - [!] combat/WeaponSpecializationRules.ts — multiple classes (Specialization + Requirements)
  - [!] combat/GrapplingRules.ts — multiple classes (Attack, StrengthComparison, Effect)
  - [!] combat/WeaponVsArmorRules.ts — multiple classes (WeaponVsArmor, WeaponType, ArmorCategory)
  - [!] combat/MountedCombatRules.ts — multiple classes (Charge, MountedCombat, Dismount, Eligibility)
  - [!] combat/AerialCombatRules.ts — multiple classes (AerialCombat, DiveAttack, AerialMovement)
  - [x] combat/UnderwaterCombatRules.ts — compliant (movement split out)
  - [x] combat/UnderwaterMovementRules.ts
  - [x] combat/InitiativeOrderRules.ts
  - [x] combat/SurpriseCheckRules.ts

- Spells
  - [!] spells/AdvancedSpellRules.ts — multiple classes (components, failure, concentration, interaction, advanced research)
  - [!] spells/MagicItemRules.ts — multiple classes (charge calc/usage, save, identification)
  - [!] spells/ScrollCreationRules.ts — multiple classes (requirements, start, progress, usage validation, failure, casting)
  - [!] spells/SpellResearchRules.ts — multiple classes (requirements, start, progress, success, learning)
  - [x] spells/MagicItemCreationRules.ts — compliant (creation mechanics split from command)
  - [x] spells/SpellCastingRules.ts
  - [x] spells/SpellEffectsRules.ts
  - [x] spells/ComponentCheckRules.ts
  - [x] spells/SpellProgressionRules.ts
  - [x] spells/SpellMemorizationRules.ts
  - [x] spells/ScrollScribingRules.ts
  - [x] spells/EnchantmentRules.ts

- NPC / System
  - [x] npc/ReactionRules.ts
  - [x] npc/TreasureGenerationRules.ts
  - [x] npc/MoraleRules.ts
  - [x] npc/MonsterBehaviorRules.ts
  - [x] npc/LoyaltyRules.ts
  - [x] npc/SpecialAbilityRules.ts
  - [x] system/BleedingTickRules.ts

Follow-ups
- Split [!] files into one rule per file, update imports and chains accordingly.
- Resolve [dup] duplicates: remove duplicates and keep the canonical file; update RULE_NAMES/chain wiring.
- After splits, re-run chain audit to ensure all required rule names are provided by exactly one file.

