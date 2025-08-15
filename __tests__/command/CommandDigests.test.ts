import { beforeEach, describe, expect, it } from 'vitest';
import { getCommandDigests, registerCommand, resetRegisteredCommands } from '../../osric';
import { buildRegistry } from '../../osric/command/register';
import { AttackRollCommand } from '../../osric/commands/attackRoll';
// Import a representative subset of commands (enough for structural coverage)
import { CreateCharacterCommand } from '../../osric/commands/createCharacter';
import { DealDamageCommand } from '../../osric/commands/dealDamage';
import { GainExperienceCommand } from '../../osric/commands/gainExperience';
import { InspirePartyCommand } from '../../osric/commands/inspireParty';
import { SavingThrowCommand } from '../../osric/commands/savingThrow';

// Item 14: schema & graph digest snapshot test
// Ensures structural digest remains stable unless rule signatures/categories/output keys change.

// Regression Guard: Captures per-command schema/category signature via digest.
// Changing digest means rule set, category, or output keys changed.
describe('Structural Regression – Command Digests', () => {
  beforeEach(() => {
    resetRegisteredCommands();
    registerCommand(CreateCharacterCommand);
    registerCommand(GainExperienceCommand);
    registerCommand(InspirePartyCommand);
    registerCommand(AttackRollCommand);
    registerCommand(DealDamageCommand);
    registerCommand(SavingThrowCommand);
  });

  it('produces stable digests', () => {
    buildRegistry(); // populate digest cache
    const digests = getCommandDigests().sort((a, b) => a.command.localeCompare(b.command));
    expect(digests).toMatchInlineSnapshot(`
      [
        {
          "command": "attackRoll",
          "digest": "9b556b85",
        },
        {
          "command": "createCharacter",
          "digest": "9f758934",
        },
        {
          "command": "dealDamage",
          "digest": "a19eaffd",
        },
        {
          "command": "gainExperience",
          "digest": "e77ed7ad",
        },
        {
          "command": "inspireParty",
          "digest": "3955947a",
        },
        {
          "command": "savingThrow",
          "digest": "32ce0ee9",
        },
      ]
    `);
  });
});
