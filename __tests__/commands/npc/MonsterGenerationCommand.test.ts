import {
  MonsterGenerationCommand,
  type MonsterGenerationParameters,
} from '@osric/commands/npc/MonsterGenerationCommand';
import { GameContext } from '@osric/core/GameContext';
import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';

describe('MonsterGenerationCommand', () => {
  let context: GameContext;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
  });

  it('should generate forest encounter', async () => {
    const params: MonsterGenerationParameters = {
      terrainType: 'forest',
      encounterLevel: 3,
      partySize: 4,
      timeOfDay: 'day',
    };

    const command = new MonsterGenerationCommand(params);
    const result = await command.execute(context);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('should generate dungeon encounter with level', async () => {
    const params: MonsterGenerationParameters = {
      terrainType: 'dungeon',
      encounterLevel: 3,
      partySize: 6,
      timeOfDay: 'night',
    };

    const command = new MonsterGenerationCommand(params);
    const result = await command.execute(context);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('should generate forced encounter', async () => {
    const params: MonsterGenerationParameters = {
      terrainType: 'plains',
      encounterLevel: 2,
      partySize: 4,
      timeOfDay: 'dusk',
      forceMonsterType: 'Orc',
    };

    const command = new MonsterGenerationCommand(params);
    const result = await command.execute(context);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('should handle lair encounters', async () => {
    const params: MonsterGenerationParameters = {
      terrainType: 'mountains',
      encounterLevel: 5,
      partySize: 5,
      timeOfDay: 'night',
      specialConditions: {
        lair: true,
      },
    };

    const command = new MonsterGenerationCommand(params);
    const result = await command.execute(context);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('should scale encounters by party size', async () => {
    const smallPartyParams: MonsterGenerationParameters = {
      terrainType: 'hills',
      encounterLevel: 2,
      partySize: 2,
      timeOfDay: 'day',
    };

    const largePartyParams: MonsterGenerationParameters = {
      terrainType: 'hills',
      encounterLevel: 2,
      partySize: 8,
      timeOfDay: 'day',
    };

    const smallResult = await new MonsterGenerationCommand(smallPartyParams).execute(context);
    const largeResult = await new MonsterGenerationCommand(largePartyParams).execute(context);

    expect(smallResult.success).toBe(true);
    expect(largeResult.success).toBe(true);

    expect(smallResult.data).toBeDefined();
    expect(largeResult.data).toBeDefined();
  });

  it('should generate appropriate monsters for terrain', async () => {
    const swampParams: MonsterGenerationParameters = {
      terrainType: 'swamp',
      encounterLevel: 4,
      partySize: 4,
      timeOfDay: 'dusk',
    };

    const command = new MonsterGenerationCommand(swampParams);
    const result = await command.execute(context);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('should handle different weather conditions', async () => {
    const params: MonsterGenerationParameters = {
      terrainType: 'arctic',
      encounterLevel: 6,
      partySize: 4,
      timeOfDay: 'day',
      weather: 'snow',
    };

    const command = new MonsterGenerationCommand(params);
    const result = await command.execute(context);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });
});
