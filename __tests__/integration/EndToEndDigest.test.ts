import { describe, expect, it } from 'vitest';
import { Engine } from '../../osric';
import { registerCommand, resetRegisteredCommands } from '../../osric/command/register';
import { AttackRollCommand } from '../../osric/commands/attackRoll';
import { CreateCharacterCommand } from '../../osric/commands/createCharacter';
import { DealDamageCommand } from '../../osric/commands/dealDamage';
import { GainExperienceCommand } from '../../osric/commands/gainExperience';
import { InspirePartyCommand } from '../../osric/commands/inspireParty';
import { SavingThrowCommand } from '../../osric/commands/savingThrow';
import { character } from '../../osric/entities/character';

// End-to-end deterministic digest test.
// Scenario: create two characters, level one, start a mock battle via inspiration + attack/damage cycle, perform saving throw.
// Assert final digest of store snapshot + events trace summary is stable for given seed.

function buildDigest(engine: Engine) {
  const storeSnap = engine.store.snapshot();
  // Minimal projection to keep digest stable (exclude volatile timestamps if any)
  const characters = Object.fromEntries(
    storeSnap.characters.map((c) => [
      c.id,
      {
        name: c.name,
        // hp intentionally omitted to reduce snapshot churn
        level: c.level,
        xp: c.xp,
        dead: c.status?.dead ?? false,
        unconscious: c.status?.unconscious ?? false,
      },
    ])
  );
  const trace = engine.events.trace.map((t) => ({ c: t.command, ok: t.ok }));
  const metrics = engine.metricsSnapshot();
  const digest = {
    characters,
    trace,
    metrics: {
      executed: metrics.commandsExecuted,
      failed: metrics.commandsFailed,
      recent: metrics.recent.map((r) => ({ c: r.command, ok: r.ok })),
    },
  };
  return JSON.stringify(digest, null, 2);
}

describe('End-to-end deterministic digest', () => {
  it('produces stable digest for scenario', async () => {
    resetRegisteredCommands();
    registerCommand(CreateCharacterCommand);
    registerCommand(GainExperienceCommand);
    registerCommand(AttackRollCommand);
    registerCommand(DealDamageCommand);
    registerCommand(SavingThrowCommand);
    registerCommand(InspirePartyCommand);

    const engine = new Engine({ seed: 123 });
    await engine.start();

    const race = character.human;
    const klass = character.fighter;

    const heroRes = await engine.execute('createCharacter', { race, class: klass, name: 'Hero' });
    const foeRes = await engine.execute('createCharacter', { race, class: klass, name: 'Foe' });
    expect(heroRes.ok && foeRes.ok).toBe(true);
    type CreateData = { characterId: string } | { characterId?: string };
    const heroId = heroRes.ok ? ((heroRes.data as unknown as CreateData).characterId ?? '') : '';
    const foeId = foeRes.ok ? ((foeRes.data as unknown as CreateData).characterId ?? '') : '';

    // Level up hero via xp gain
    const xpRes = await engine.execute('gainExperience', { characterId: heroId, amount: 1200 });
    expect(xpRes.ok).toBe(true);

    // Hero inspires (if applicable)
    await engine.execute('inspireParty', { leader: heroId, bonus: 1, message: 'Charge!' });

    // Attack roll hero->foe then deal damage (simulate fixed damage)
    const attackRes = await engine.execute('attackRoll', { attacker: heroId, target: foeId });
    expect(attackRes.ok).toBe(true);

    await engine.execute('dealDamage', {
      source: heroId,
      target: foeId,
      attackContext: { hit: true, critical: false },
    });

    // Foe attempts saving throw (may fail if dead/unconscious but that's fine for digest)
    await engine.execute('savingThrow', { characterId: foeId, type: 'death' });

    const digest = buildDigest(engine);

    // If digest changes legitimately update snapshot string below.
    expect(digest).toMatchInlineSnapshot(`
    "{
      "characters": {
        "char_11jkltu1": {
          "name": "Hero",
          "level": 2,
          "xp": 1200,
          "dead": false,
          "unconscious": false
        },
        "char_u4xgawjf": {
          "name": "Foe",
          "level": 1,
          "xp": 0,
          "dead": false,
          "unconscious": false
        }
      },
      "trace": [
        {
          "c": "createCharacter",
          "ok": true
        },
        {
          "c": "createCharacter",
          "ok": true
        },
        {
          "c": "gainExperience",
          "ok": true
        },
        {
          "c": "inspireParty",
          "ok": true
        },
        {
          "c": "attackRoll",
          "ok": true
        },
        {
          "c": "dealDamage",
          "ok": true
        },
        {
          "c": "savingThrow",
          "ok": true
        }
      ],
      "metrics": {
        "executed": 7,
        "failed": 0,
        "recent": [
          {
            "c": "createCharacter",
            "ok": true
          },
          {
            "c": "createCharacter",
            "ok": true
          },
          {
            "c": "gainExperience",
            "ok": true
          },
          {
            "c": "inspireParty",
            "ok": true
          },
          {
            "c": "attackRoll",
            "ok": true
          },
          {
            "c": "dealDamage",
            "ok": true
          },
          {
            "c": "savingThrow",
            "ok": true
          }
        ]
      }
    }"
  `);
  });
});
