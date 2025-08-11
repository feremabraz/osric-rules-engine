import { BaseCommand, type CommandResult, type EntityId } from '../../core/Command';
import type { GameContext } from '../../core/GameContext';
import { COMMAND_TYPES } from '../../types/constants';
import type { Monster } from '../../types/entities';

export interface MonsterGenerationParameters {
  terrainType:
    | 'dungeon'
    | 'forest'
    | 'plains'
    | 'hills'
    | 'mountains'
    | 'swamp'
    | 'desert'
    | 'arctic'
    | 'ocean'
    | 'city';
  encounterLevel: number;
  partySize: number;
  timeOfDay?: 'day' | 'night' | 'dawn' | 'dusk';
  weather?: 'clear' | 'rain' | 'storm' | 'fog' | 'snow';
  specialConditions?: {
    guardedArea?: boolean;
    lair?: boolean;
    wandering?: boolean;
    civilized?: boolean;
  };
  forceMonsterType?: string;
}

export interface MonsterTemplate {
  name: string;
  hitDice: string;
  armorClass: number;
  numberAppearing: string;
  level: number;
  specialAbilities?: string[];
}

export class MonsterGenerationCommand extends BaseCommand<MonsterGenerationParameters> {
  readonly type = COMMAND_TYPES.MONSTER_GENERATION;
  readonly parameters: MonsterGenerationParameters;

  constructor(
    parameters: MonsterGenerationParameters,
    actorId: EntityId,
    targetIds: EntityId[] = []
  ) {
    super(parameters, actorId, targetIds);
    this.parameters = parameters;
  }

  async execute(context: GameContext): Promise<CommandResult> {
    try {
      const {
        terrainType,
        encounterLevel,
        partySize,
        timeOfDay = 'day',
        weather = 'clear',
        specialConditions = {},
        forceMonsterType,
      } = this.parameters;

      if (encounterLevel < 1 || encounterLevel > 20) {
        return this.createFailureResult('Encounter level must be between 1 and 20');
      }

      if (partySize < 1 || partySize > 12) {
        return this.createFailureResult('Party size must be between 1 and 12');
      }

      context.setTemporary('monster-generation-params', {
        terrainType,
        encounterLevel,
        partySize,
        timeOfDay,
        weather,
        specialConditions,
        forceMonsterType,
      });

      const generatedMonsters = await this.generateMonsters(
        terrainType,
        encounterLevel,
        partySize,
        specialConditions,
        forceMonsterType
      );

      for (const monster of generatedMonsters) {
        context.setEntity(monster.id, monster);
      }

      return this.createSuccessResult(
        `Generated ${generatedMonsters.length} monster(s) in ${terrainType} terrain`,
        {
          monsters: generatedMonsters,
          encounterDetails: {
            terrain: terrainType,
            level: encounterLevel,
            conditions: { timeOfDay, weather, ...specialConditions },
          },
        }
      );
    } catch (error) {
      return this.createFailureResult(
        `Monster generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  canExecute(_context: GameContext): boolean {
    return true;
  }

  getRequiredRules(): string[] {
    return ['monster-behavior', 'special-abilities', 'treasure-generation'];
  }

  private getMonsterStatsByHD(hitDice: string): { thac0: number; saves: Record<string, number> } {
    const hdMatch = hitDice.match(/^(\d+)([+-]\d+)?$/);
    if (!hdMatch) {
      return { thac0: 20, saves: { death: 16, wands: 17, paralysis: 18, breath: 20, spells: 19 } };
    }

    const baseHD = Number.parseInt(hdMatch[1]);

    let thac0: number;
    if (baseHD <= 1) thac0 = 20;
    else if (baseHD <= 2) thac0 = 19;
    else if (baseHD <= 3) thac0 = 18;
    else if (baseHD <= 4) thac0 = 17;
    else if (baseHD <= 5) thac0 = 16;
    else if (baseHD <= 6) thac0 = 15;
    else if (baseHD <= 7) thac0 = 14;
    else if (baseHD <= 8) thac0 = 13;
    else if (baseHD <= 9) thac0 = 12;
    else if (baseHD <= 10) thac0 = 11;
    else if (baseHD <= 11) thac0 = 10;
    else if (baseHD <= 12) thac0 = 9;
    else if (baseHD <= 13) thac0 = 8;
    else if (baseHD <= 14) thac0 = 7;
    else if (baseHD <= 15) thac0 = 6;
    else if (baseHD <= 16) thac0 = 5;
    else thac0 = 4;

    const saves = this.getSavesByHD(baseHD);

    return { thac0, saves };
  }

  private async generateMonsters(
    terrainType: string,
    encounterLevel: number,
    partySize: number,
    _specialConditions: Record<string, boolean>,
    forceMonsterType?: string
  ): Promise<Monster[]> {
    if (forceMonsterType) {
      return [this.createMonsterByType(forceMonsterType, encounterLevel)];
    }

    const possibleMonsters = this.getMonstersByTerrain(terrainType, encounterLevel);

    if (possibleMonsters.length === 0) {
      return [this.createGenericMonster(encounterLevel)];
    }

    const selectedMonster = possibleMonsters[Math.floor(Math.random() * possibleMonsters.length)];
    const numberAppearing = this.rollNumberAppearing(selectedMonster.numberAppearing, partySize);

    const monsters: Monster[] = [];
    for (let i = 0; i < numberAppearing; i++) {
      monsters.push(this.createMonsterFromTemplate(selectedMonster, i));
    }

    return monsters;
  }

  private getMonstersByTerrain(terrainType: string, encounterLevel: number): MonsterTemplate[] {
    const encounterTables: Record<string, MonsterTemplate[]> = {
      dungeon: [
        { name: 'Goblin', hitDice: '1-1', armorClass: 6, numberAppearing: '2d4', level: 1 },
        { name: 'Orc', hitDice: '1', armorClass: 6, numberAppearing: '2d8', level: 1 },
        { name: 'Skeleton', hitDice: '1', armorClass: 7, numberAppearing: '3d4', level: 1 },
        { name: 'Zombie', hitDice: '2', armorClass: 8, numberAppearing: '2d6', level: 2 },
        { name: 'Ogre', hitDice: '4+1', armorClass: 5, numberAppearing: '1d6', level: 4 },
        {
          name: 'Troll',
          hitDice: '6+6',
          armorClass: 4,
          numberAppearing: '1d8',
          level: 6,
          specialAbilities: ['regeneration'],
        },
      ],
      forest: [
        { name: 'Wolf', hitDice: '2+2', armorClass: 7, numberAppearing: '2d6', level: 2 },
        { name: 'Bear', hitDice: '5+5', armorClass: 6, numberAppearing: '1d4', level: 5 },
        { name: 'Owlbear', hitDice: '5+2', armorClass: 5, numberAppearing: '1d4', level: 5 },
        { name: 'Treant', hitDice: '8', armorClass: 2, numberAppearing: '1d8', level: 8 },
      ],
      plains: [
        { name: 'Wild Horse', hitDice: '2', armorClass: 7, numberAppearing: '1d12', level: 2 },
        { name: 'Lion', hitDice: '5+2', armorClass: 6, numberAppearing: '1d8', level: 5 },
        { name: 'Centaur', hitDice: '4', armorClass: 5, numberAppearing: '1d12', level: 4 },
      ],
    };

    const terrain = encounterTables[terrainType] || encounterTables.dungeon;

    return terrain.filter(
      (monster) => monster.level >= encounterLevel - 2 && monster.level <= encounterLevel + 2
    );
  }

  private rollNumberAppearing(notation: string, partySize: number): number {
    const match = notation.match(/^(\d+)d(\d+)([+-]\d+)?$/);
    if (!match) return 1;

    const numDice = Number.parseInt(match[1]);
    const dieSize = Number.parseInt(match[2]);
    const modifier = match[3] ? Number.parseInt(match[3]) : 0;

    let total = 0;
    for (let i = 0; i < numDice; i++) {
      total += Math.floor(Math.random() * dieSize) + 1;
    }

    const sizeAdjustment = partySize > 4 ? Math.floor(partySize / 4) : 0;

    return Math.max(1, total + modifier + sizeAdjustment);
  }

  private createMonsterFromTemplate(template: MonsterTemplate, index: number): Monster {
    const hitPoints = this.rollHitPoints(template.hitDice);
    const stats = this.getMonsterStatsByHD(template.hitDice);

    return {
      id: `${template.name.toLowerCase().replace(/\s+/g, '-')}-${index + 1}`,
      name: template.name,
      level: Math.max(1, Math.floor(Number.parseInt(template.hitDice.split(/[+-]/)[0]))),
      hitPoints: { current: hitPoints, maximum: hitPoints },
      armorClass: template.armorClass,
      thac0: stats.thac0,
      experience: { current: 0, requiredForNextLevel: 1000, level: 1 },
      alignment: 'True Neutral',
      inventory: [],
      position: 'unknown',
      statusEffects: [],
      hitDice: template.hitDice,
      damagePerAttack: ['1d6'],
      morale: 8,
      treasure: 'None',
      specialAbilities: template.specialAbilities || [],
      xpValue: this.calculateXPValue(template.hitDice),
      size: 'Medium',
      movementTypes: [{ type: 'Walk', rate: 12 }],
      habitat: ['any'],
      frequency: 'Common',
      organization: 'pack',
      diet: 'omnivore',
      ecology: 'Any terrain',
      exceptional: false,
    };
  }

  private calculateXPValue(hitDice: string): number {
    const match = hitDice.match(/^(\d+)([+-]\d+)?$/);
    if (!match) return 10;

    const baseHD = Number.parseInt(match[1]);

    if (baseHD <= 1) return 10;
    if (baseHD === 2) return 20;
    if (baseHD === 3) return 35;
    if (baseHD === 4) return 75;
    if (baseHD === 5) return 175;
    if (baseHD === 6) return 275;
    if (baseHD === 7) return 450;
    if (baseHD === 8) return 650;
    if (baseHD >= 9) return 650 + (baseHD - 8) * 200;

    return 10;
  }

  private createMonsterByType(monsterType: string, level: number): Monster {
    const hitPoints = Math.max(1, level * 4 + Math.floor(Math.random() * 8));
    const stats = this.getMonsterStatsByHD(`${level}`);

    return {
      id: `${monsterType.toLowerCase().replace(/\s+/g, '-')}-1`,
      name: monsterType,
      level: level,
      hitPoints: { current: hitPoints, maximum: hitPoints },
      armorClass: Math.max(0, 10 - Math.floor(level / 2)),
      thac0: stats.thac0,
      experience: { current: 0, requiredForNextLevel: 1000, level: level },
      alignment: 'True Neutral',
      inventory: [],
      position: 'unknown',
      statusEffects: [],
      hitDice: `${level}`,
      damagePerAttack: [`1d${Math.min(12, 4 + level)}`],
      morale: Math.min(12, 6 + level),
      treasure: 'None',
      specialAbilities: [],
      xpValue: this.calculateXPValue(`${level}`),
      size: 'Medium',
      movementTypes: [{ type: 'Walk', rate: 12 }],
      habitat: ['any'],
      frequency: 'Common',
      organization: 'pack',
      diet: 'omnivore',
      ecology: 'Any terrain',
      exceptional: false,
    };
  }

  private createGenericMonster(level: number): Monster {
    return this.createMonsterByType('Generic Creature', level);
  }

  private rollHitPoints(hitDice: string): number {
    const match = hitDice.match(/^(\d+)([+-]\d+)?$/);
    if (!match) return 1;

    const numDice = Number.parseInt(match[1]);
    const modifier = match[2] ? Number.parseInt(match[2]) : 0;

    let total = 0;
    for (let i = 0; i < numDice; i++) {
      total += Math.floor(Math.random() * 8) + 1;
    }

    return Math.max(1, total + modifier);
  }

  private getSavesByHD(hd: number): Record<string, number> {
    if (hd <= 1) return { death: 14, wands: 15, paralysis: 16, breath: 17, spells: 18 };
    if (hd <= 3) return { death: 13, wands: 14, paralysis: 15, breath: 16, spells: 17 };
    if (hd <= 5) return { death: 11, wands: 12, paralysis: 13, breath: 13, spells: 14 };
    if (hd <= 7) return { death: 10, wands: 11, paralysis: 12, breath: 12, spells: 13 };
    if (hd <= 9) return { death: 8, wands: 9, paralysis: 10, breath: 9, spells: 11 };
    if (hd <= 11) return { death: 7, wands: 8, paralysis: 9, breath: 8, spells: 10 };
    if (hd <= 13) return { death: 5, wands: 6, paralysis: 7, breath: 5, spells: 8 };
    if (hd <= 15) return { death: 4, wands: 5, paralysis: 6, breath: 4, spells: 7 };
    return { death: 3, wands: 4, paralysis: 5, breath: 3, spells: 6 };
  }
}
