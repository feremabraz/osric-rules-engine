import type { Character } from '@rules/types';

export interface ConstructionProject {
  id: string;
  name: string;
  type: 'building' | 'defense' | 'improvement' | 'other';
  cost: number;
  timeRequired: number; // in days
  requiredWorkers: Record<string, number>; // worker type -> count
  progress: number; // 0-100
  status: 'planning' | 'inProgress' | 'paused' | 'completed' | 'failed';
  startedOn?: Date;
  completedOn?: Date;
  architectHired: boolean;
  collapseRisk: number; // 0-100% chance of collapse without architect
}

export type StrongholdType =
  | 'castle'
  | 'tower'
  | 'temple'
  | 'thieves_guild'
  | 'lodge'
  | 'wizard_tower'
  | 'other';

export interface Stronghold {
  id: string;
  ownerId: string;
  name: string;
  type: StrongholdType;
  location: string;
  level: number;
  defenses: number;
  projects: ConstructionProject[];
  hirelings: Hireling[];
  clearedRadius: number; // in miles
  taxRate: number; // 0-1 (percentage of max 1gp/month per person)
  income: number; // monthly income in gp
  expenses: number; // monthly expenses in gp
  treasury: number; // current gold in treasury
  steward?: {
    characterId: string;
    loyalty: number; // 1-20
    competence: number; // 1-20
  };
}

export interface Hireling {
  id: string;
  name: string;
  type:
    | 'engineer'
    | 'mason'
    | 'blacksmith'
    | 'armorer'
    | 'weaponer'
    | 'carpenter'
    | 'laborer'
    | 'soldier'
    | 'specialist';
  level: number;
  wage: number; // per day in gp
  skillBonus: number;
  currentlyAssigned?: string; // project ID
}

// Production rates for various items
export const productionRates = {
  // Armor
  'Plate Armor': {
    days: 90,
    cost: 1200,
    requiredWorkers: { armorer: 1, blacksmith: 1 },
    requiredFacility: 'forge',
  },
  'Chain Mail': {
    days: 60,
    cost: 750,
    requiredWorkers: { armorer: 1, blacksmith: 1 },
    requiredFacility: 'forge',
  },
  'Leather Armor': {
    days: 14,
    cost: 50,
    requiredWorkers: { armorer: 1 },
    requiredFacility: 'workshop',
  },

  // Weapons
  Longsword: {
    days: 7,
    cost: 150,
    requiredWorkers: { weaponer: 1 },
    requiredFacility: 'forge',
  },
  Longbow: {
    days: 14,
    cost: 100,
    requiredWorkers: { carpenter: 1 },
    requiredFacility: 'workshop',
  },

  // Defenses
  'Stone Wall (10ft)': {
    days: 30,
    cost: 500,
    requiredWorkers: { mason: 2, laborer: 4 },
    requiredFacility: 'quarry',
  },
  'Wooden Palisade (10ft)': {
    days: 7,
    cost: 100,
    requiredWorkers: { carpenter: 1, laborer: 2 },
    requiredFacility: 'lumberyard',
  },
} as const;

/**
 * Calculates monthly income for a stronghold
 */
export function calculateMonthlyIncome(stronghold: Stronghold, population: number): number {
  // Base income from taxes (up to 1gp per person per month)
  const taxIncome = Math.floor(population * stronghold.taxRate);

  // Bonus from steward
  let stewardBonus = 0;
  if (stronghold.steward) {
    // Competence bonus (1-20 -> 0-50% bonus)
    const competenceBonus = (stronghold.steward.competence / 40) * taxIncome;
    // Loyalty bonus (1-20 -> 0-20% bonus)
    const loyaltyBonus = (stronghold.steward.loyalty / 100) * taxIncome;

    stewardBonus = Math.floor(competenceBonus + loyaltyBonus);
  }

  // Add any other income sources here

  return taxIncome + stewardBonus;
}

/**
 * Calculates monthly expenses for a stronghold
 */
export function calculateMonthlyExpenses(stronghold: Stronghold): number {
  // Worker wages
  const workerWages = stronghold.hirelings.reduce(
    (total, worker) => total + worker.wage * 30, // 30 days per month
    0
  );

  // Steward wage (if any)
  const stewardWage = stronghold.steward ? 100 : 0; // Example flat rate

  // Maintenance costs (1% of stronghold value)
  const strongholdValue = 10000; // This would be calculated based on buildings, etc.
  const maintenance = Math.floor(strongholdValue * 0.01);

  return workerWages + stewardWage + maintenance;
}

/**
 * Handles follower attraction for high-level characters
 */
interface Follower {
  type: string;
  count?: number;
  name?: string;
  loyalty?: number;
  specialAbilities?: string[];
}

export function checkFollowerAttraction(character: Character): {
  success: boolean;
  followers?: Follower[];
} {
  // Check if character has a stronghold
  interface CharacterWithStronghold extends Character {
    stronghold?: Stronghold;
  }

  const stronghold = (character as CharacterWithStronghold).stronghold;
  if (!stronghold) return { success: false };

  // Fighters of 9th+ level who build a castle and clear a 20-mile radius attract mercenaries
  if (
    character.class === 'Fighter' &&
    character.level >= 9 &&
    stronghold.type === 'castle' &&
    stronghold.clearedRadius >= 20
  ) {
    // Determine number and type of mercenaries
    const mercenaries = [];
    const roll = Math.floor(Math.random() * 20) + 1 + Math.floor(character.level / 2);

    if (roll >= 20) {
      // Attract elite troops
      mercenaries.push({
        type: 'Veteran Soldiers',
        count: 2 + Math.floor(Math.random() * 8),
        loyalty: 10 + Math.floor(Math.random() * 6), // 10-15
      });
    } else if (roll >= 15) {
      // Attract regular troops
      mercenaries.push({
        type: 'Regular Soldiers',
        count: 5 + Math.floor(Math.random() * 10),
        loyalty: 8 + Math.floor(Math.random() * 6), // 8-13
      });
    } else if (roll >= 10) {
      // Attract light infantry
      mercenaries.push({
        type: 'Light Infantry',
        count: 10 + Math.floor(Math.random() * 20),
        loyalty: 5 + Math.floor(Math.random() * 6), // 5-10
      });
    }

    return {
      success: mercenaries.length > 0,
      followers: mercenaries,
    };
  }

  // Rangers gain special followers at 10th level
  if (
    character.class === 'Ranger' &&
    character.level >= 10 &&
    stronghold.type === 'lodge' &&
    stronghold.clearedRadius >= 20
  ) {
    const specialFollowerRoll = Math.floor(Math.random() * 20) + 1;
    if (specialFollowerRoll >= 18) {
      const specialTypes = ['Centaur', 'Werebear', 'Pegasus', 'Unicorn', 'Treant'];
      return {
        success: true,
        followers: [
          {
            type: 'Special Creature',
            name: specialTypes[Math.floor(Math.random() * specialTypes.length)],
            loyalty: 15 + Math.floor(Math.random() * 6), // 15-20
            specialAbilities: [], // Would be populated based on creature type
          },
        ],
      };
    }
  }

  return { success: false };
}

/**
 * Updates construction progress on all active projects
 */
export function updateConstruction(stronghold: Stronghold, days = 1): Stronghold {
  const updatedStronghold = { ...stronghold };

  updatedStronghold.projects = updatedStronghold.projects.map((project) => {
    if (project.status !== 'inProgress') return project;

    const updatedProject = { ...project };

    // Calculate progress for this period
    const dailyProgress = 100 / updatedProject.timeRequired;
    let progressThisPeriod = dailyProgress * days;

    // Apply architect bonus (reduces construction time by 10%)
    if (updatedProject.architectHired) {
      progressThisPeriod *= 1.1;
    }

    updatedProject.progress = Math.min(100, updatedProject.progress + progressThisPeriod);

    // Check for completion
    if (updatedProject.progress >= 100) {
      updatedProject.status = 'completed';
      updatedProject.completedOn = new Date();
      // Apply any completion effects here
    }

    return updatedProject;
  });

  return updatedStronghold;
}

/**
 * Calculates the risk of construction failure for a project
 */
export function calculateCollapseRisk(project: ConstructionProject, hasArchitect: boolean): number {
  // Base risk is reduced by having an architect
  let risk = project.collapseRisk;

  if (hasArchitect) {
    risk = Math.max(0, risk - 75); // Architect reduces risk by 75%
  }

  return Math.min(100, Math.max(0, risk));
}

/**
 * Attempts to construct an item in the stronghold
 */
export function attemptConstruction(
  stronghold: Stronghold,
  itemName: keyof typeof productionRates,
  quantity = 1
): { success: boolean; message: string; project?: ConstructionProject } {
  const item = productionRates[itemName];
  if (!item) {
    return { success: false, message: 'Unknown item' };
  }

  // Check if we have the required workers
  for (const [workerType, count] of Object.entries(item.requiredWorkers)) {
    const available = stronghold.hirelings.filter(
      (h) => h.type === workerType && !h.currentlyAssigned
    ).length;

    if (available < count * quantity) {
      return {
        success: false,
        message: `Not enough available ${workerType}s (need ${count * quantity}, have ${available})`,
      };
    }
  }

  // Check if we have the required facility
  // This would be implemented based on your stronghold's facilities

  // Create project
  const project: ConstructionProject = {
    id: `proj_${Date.now()}`,
    name: `Produce ${quantity}x ${itemName}`,
    type: 'other',
    cost: item.cost * quantity,
    timeRequired: item.days * quantity,
    requiredWorkers: Object.fromEntries(
      Object.entries(item.requiredWorkers).map(([type, count]) => [type, count * quantity])
    ),
    progress: 0,
    status: 'inProgress',
    architectHired: false, // Would check if architect is available
    collapseRisk: 0, // No collapse risk for production, only for construction
  };

  // Assign workers
  const updatedHirelings = [...stronghold.hirelings];
  for (const [workerType, count] of Object.entries(item.requiredWorkers)) {
    let assigned = 0;
    for (let i = 0; i < updatedHirelings.length && assigned < count * quantity; i++) {
      if (updatedHirelings[i].type === workerType && !updatedHirelings[i].currentlyAssigned) {
        updatedHirelings[i] = {
          ...updatedHirelings[i],
          currentlyAssigned: project.id,
        };
        assigned++;
      }
    }
  }

  return {
    success: true,
    message: `Started production of ${quantity}x ${itemName}`,
    project,
  };
}
