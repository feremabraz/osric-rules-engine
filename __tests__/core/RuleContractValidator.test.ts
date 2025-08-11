import { describe, expect, it } from 'vitest';
import { BaseRule } from '../../osric/core/Rule';
import { RuleChain } from '../../osric/core/RuleChain';
import { RuleContractValidator } from '../../osric/core/RuleContractValidator';
import { RuleEngine } from '../../osric/core/RuleEngine';
import { COMMAND_TYPES, RULE_NAMES } from '../../osric/types/constants';

class DummyRule extends BaseRule {
  constructor(public readonly name: string) {
    super();
  }
}

describe('RuleContractValidator', () => {
  it('flags missing rules per command based on actual chain contents', async () => {
    const engine = new RuleEngine();

    // Register chains with incomplete rules on purpose
    const createCharChain = new RuleChain();
    createCharChain.addRule(new DummyRule(RULE_NAMES.ABILITY_SCORE_GENERATION));
    // Missing CLASS_REQUIREMENTS, RACIAL_RESTRICTIONS, STARTING_EQUIPMENT
    engine.registerRuleChain(COMMAND_TYPES.CREATE_CHARACTER, createCharChain);

    const savingThrowChain = new RuleChain();
    savingThrowChain.addRule(new DummyRule(RULE_NAMES.SAVING_THROWS));
    // Missing SAVING_THROW_CALCULATION
    engine.registerRuleChain(COMMAND_TYPES.SAVING_THROW, savingThrowChain);

    const validation = RuleContractValidator.validateAllContracts(engine);

    expect(validation.valid).toBe(false);
    expect(validation.stats.missingRules).toEqual(
      expect.arrayContaining([
        RULE_NAMES.CLASS_REQUIREMENTS,
        RULE_NAMES.RACIAL_RESTRICTIONS,
        RULE_NAMES.STARTING_EQUIPMENT,
        RULE_NAMES.SAVING_THROW_CALCULATION,
      ])
    );

    // Ensure issues mention the specific command
    const createIssues = validation.issues.filter((i) =>
      i.includes(COMMAND_TYPES.CREATE_CHARACTER)
    );
    expect(createIssues.length).toBeGreaterThan(0);
  });

  it('passes when chains contain all required rules', async () => {
    const engine = new RuleEngine();

    const createCharChain = new RuleChain();
    createCharChain.addRules([
      new DummyRule(RULE_NAMES.ABILITY_SCORE_GENERATION),
      new DummyRule(RULE_NAMES.CLASS_REQUIREMENTS),
      new DummyRule(RULE_NAMES.RACIAL_RESTRICTIONS),
      new DummyRule(RULE_NAMES.STARTING_EQUIPMENT),
    ]);
    engine.registerRuleChain(COMMAND_TYPES.CREATE_CHARACTER, createCharChain);

    const savingThrowChain = new RuleChain();
    savingThrowChain.addRules([
      new DummyRule(RULE_NAMES.SAVING_THROWS),
      new DummyRule(RULE_NAMES.SAVING_THROW_CALCULATION),
    ]);
    engine.registerRuleChain(COMMAND_TYPES.SAVING_THROW, savingThrowChain);

    const validation = RuleContractValidator.validateAllContracts(engine);
    expect(validation.valid).toBe(true);
    expect(validation.issues).toHaveLength(0);
    expect(validation.stats.missingRules).toHaveLength(0);
  });
});
