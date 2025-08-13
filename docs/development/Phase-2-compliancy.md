
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
  - [x] character/AbilityScoreGenerationRules.ts — now single class; ExceptionalStrengthRules and RacialAbilityAdjustmentRules moved to dedicated files [dup resolved]
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
  - [x] combat/InitiativeRules.ts — now single class (InitiativeRoll); SurpriseCheck and InitiativeOrder are in dedicated files
  - [x] combat/InitiativeOrderRules.ts
  - [x] combat/SurpriseCheckRules.ts
  - [x] combat/AttackRollRules.ts
  - [x] combat/DamageCalculationRules.ts
  - [x] combat/ApplyDamageRules.ts
  - [x] combat/PostDamageStatusRules.ts
  - [x] combat/MultipleAttackRules.ts — now single class; AttackPrecedence moved to dedicated file
  - [x] combat/AttackPrecedenceRules.ts — dedicated file created
  - [x] combat/WeaponSpecializationRules.ts — single class; SpecializationRequirementRules in its own file
  - [x] combat/GrapplingRules.ts — split into GrappleAttackRules.ts, StrengthComparisonRules.ts, GrappleEffectRules.ts
  - [x] combat/WeaponVsArmorRules.ts — core kept; WeaponTypeRules.ts and ArmorCategoryRules.ts in dedicated files
  - [x] combat/WeaponTypeRules.ts — dedicated file created
  - [x] combat/ArmorCategoryRules.ts — dedicated file created
  - [x] combat/MountedCombatRules.ts — now shared types only; rules split into MountedChargeRules.ts, MountedCombatCoreRules.ts, DismountRules.ts, MountedCombatEligibilityRules.ts
  - [x] combat/AerialCombatRules.ts — now single class (AerialCombat); shared utilities in AerialCombatShared.ts; DiveAttackRules.ts and AerialMovementRules.ts created
  - [x] combat/UnderwaterCombatRules.ts — compliant (movement split out)
  - [x] combat/UnderwaterMovementRules.ts
  - [x] combat/InitiativeOrderRules.ts
  - [x] combat/SurpriseCheckRules.ts

- Spells
  - [x] spells/AdvancedSpellRules.ts — deprecated placeholder; split into:
    - SpellComponentManagementRules.ts
    - SpellFailureRules.ts
    - SpellConcentrationRules.ts
    - SpellInteractionRules.ts
    - AdvancedSpellResearchRules.ts
  - [x] spells/MagicItemRules.ts — deprecated placeholder; split into:
    - MagicItemChargeCalculationRules.ts
    - MagicItemChargeUsageRules.ts
    - MagicItemSavingThrowRules.ts
    - MagicItemIdentificationRules.ts
  - [x] spells/ScrollCreationRules.ts — deprecated placeholder; split into:
    - ScrollCreationRequirementsRules.ts
    - ScrollCreationStartRules.ts
    - ScrollCreationProgressRules.ts
    - ScrollUsageValidationRules.ts
    - ScrollCastingFailureRules.ts
    - ScrollSpellCastingRules.ts
  - [x] spells/SpellResearchRules.ts — deprecated placeholder; split into:
    - SpellResearchRequirementsRules.ts
    - SpellResearchStartRules.ts
    - SpellResearchProgressRules.ts
    - SpellResearchSuccessRules.ts
    - SpellLearningRules.ts
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
- Split [!] files into one rule per file, update imports and chains accordingly. (None pending in Spells.)
- Resolve [dup] duplicates: remove duplicates and keep the canonical file; update RULE_NAMES/chain wiring.
- After splits, re-run chain audit to ensure all required rule names are provided by exactly one file.

Next actions (Phase-2 ongoing)
- Finish Weapon vs Armor wiring: confirm chains/imports reference WeaponTypeRules and ArmorCategoryRules where needed; validate adjustments.
- Split remaining multi-export files:
  - combat/AerialCombatRules.ts (done)
  - spells/AdvancedSpellRules.ts (done)
  - spells/MagicItemRules.ts (done)
  - spells/ScrollCreationRules.ts (done)
  - spells/SpellResearchRules.ts (done)
- Run project checks once the above are in place. Then run `pnpm check`.

