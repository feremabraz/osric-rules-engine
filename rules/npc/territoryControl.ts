import type { Character } from '../types';
import type { LoyaltyRecord } from './loyaltySystem';
import { createLoyaltyRecord } from './loyaltySystem';

/**
 * Represents a steward who manages a territory or stronghold
 */
export interface Steward {
  character: Character;
  level: number;
  monthlyWage: number; // Level × 100 gp
  loyalty: LoyaltyRecord;
  commandLimit: number; // 40 men-at-arms per level
  lieutenants: Lieutenant[];
  startDate: number; // Game time when steward was appointed
  specialAbilities: string[];
}

/**
 * Represents a lieutenant under a steward
 */
export interface Lieutenant {
  character: Character;
  level: number;
  monthlyWage: number; // Level × 100 gp
  loyalty: LoyaltyRecord;
  commandLimit: number; // 20 men-at-arms per level
  specialties: string[];
  startDate: number; // Game time when lieutenant was appointed
}

/**
 * A territory controlled by a player character
 */
export interface Territory {
  id: string;
  name: string;
  location: string;
  size: number; // In square miles
  terrain: string;
  ownerId: string; // ID of the character who owns this territory
  resources: TerritoryResource[];
  settlements: Settlement[];
  population: number;
  fortifications: Fortification[];
  income: TerritoryIncome;
  expenses: TerritoryExpenses;
  threats: TerritoryThreat[];
  steward: Steward | null;
  garrison: Garrison;
  controlledSince: number; // Game time when territory was acquired
  reputationScore: number; // 0-100 scale
}

/**
 * Resources available in a territory
 */
export interface TerritoryResource {
  type: string; // e.g., 'Timber', 'Ore', 'Farmland'
  quality: 'Poor' | 'Average' | 'Good' | 'Exceptional';
  monthlyYield: number; // In gold pieces
  developmentLevel: number; // 0-10 scale
  workersAssigned: number;
}

/**
 * A settlement within a territory
 */
export interface Settlement {
  name: string;
  type: 'Village' | 'Town' | 'City' | 'Stronghold';
  population: number;
  loyalty: number; // 0-100 scale
  services: string[]; // Available services
  defenses: string[]; // Defensive measures
  taxRate: number; // Percentage
  monthlyTaxRevenue: number; // In gold pieces
  specialFeatures: string[];
}

/**
 * Fortifications in a territory
 */
export interface Fortification {
  type: string; // e.g., 'Castle', 'Keep', 'Tower', 'Wall'
  condition: 'Ruined' | 'Poor' | 'Average' | 'Good' | 'Excellent';
  defensiveValue: number; // 1-10 scale
  maintenanceCost: number; // Monthly in gold pieces
  garrisonCapacity: number; // Number of troops it can house
  specialFeatures: string[];
}

/**
 * Income from a territory
 */
export interface TerritoryIncome {
  taxes: number; // Monthly in gold pieces
  resources: number; // Monthly in gold pieces
  trade: number; // Monthly in gold pieces
  services: number; // Monthly in gold pieces
  other: number; // Miscellaneous income
  total: number; // Total monthly income
}

/**
 * Expenses for a territory
 */
export interface TerritoryExpenses {
  wages: number; // Monthly in gold pieces
  maintenance: number; // Monthly in gold pieces
  supplies: number; // Monthly in gold pieces
  development: number; // Monthly in gold pieces
  other: number; // Miscellaneous expenses
  total: number; // Total monthly expenses
}

/**
 * Threats to a territory
 */
export interface TerritoryThreat {
  type: string; // e.g., 'Monsters', 'Rival Lord', 'Bandits'
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  location: string;
  timeframe: 'Immediate' | 'Short-term' | 'Long-term';
  resources: number; // Estimated resources needed to address
  description: string;
}

/**
 * Garrison defending a territory
 */
export interface Garrison {
  troops: GarrisonTroop[];
  totalStrength: number;
  readiness: number; // 0-100 scale
  morale: number; // 0-100 scale
  monthlyCost: number; // In gold pieces
  equipment: EquipmentStatus;
}

/**
 * Types of troops in a garrison
 */
export interface GarrisonTroop {
  type: string; // e.g., 'Footman', 'Archer', 'Knight'
  count: number;
  quality: 'Poor' | 'Average' | 'Good' | 'Elite';
  morale: number; // 0-100 scale
  monthlyCost: number; // Per individual in gold pieces
  equipment: EquipmentStatus;
}

/**
 * Equipment status for troops
 */
export interface EquipmentStatus {
  weapons: 'Poor' | 'Average' | 'Good' | 'Excellent';
  armor: 'Poor' | 'Average' | 'Good' | 'Excellent';
  supplies: 'Low' | 'Adequate' | 'Abundant';
  maintenanceNeeded: boolean;
}

/**
 * Create a new steward
 */
export function createSteward(character: Character, owner: Character): Steward {
  const level = character.level;
  const monthlyWage = level * 100; // 100 gp per level as per OSRIC
  const loyalty = createLoyaltyRecord(character, owner);
  const commandLimit = level * 40; // 40 men-at-arms per level

  return {
    character,
    level,
    monthlyWage,
    loyalty,
    commandLimit,
    lieutenants: [],
    startDate: Date.now(), // Use current timestamp as placeholder
    specialAbilities: [],
  };
}

/**
 * Create a new lieutenant
 */
export function createLieutenant(character: Character, steward: Character): Lieutenant {
  const level = character.level;
  const monthlyWage = level * 100; // 100 gp per level as per OSRIC
  const loyalty = createLoyaltyRecord(character, steward);
  const commandLimit = level * 20; // 20 men-at-arms per level

  return {
    character,
    level,
    monthlyWage,
    loyalty,
    commandLimit,
    specialties: [],
    startDate: Date.now(), // Use current timestamp as placeholder
  };
}

/**
 * Calculate monthly income for a territory
 */
export function calculateTerritoryIncome(territory: Territory): TerritoryIncome {
  // Calculate taxes from settlements
  const taxes = territory.settlements.reduce(
    (total, settlement) => total + settlement.monthlyTaxRevenue,
    0
  );

  // Calculate resource income
  const resources = territory.resources.reduce((total, resource) => {
    // Base yield adjusted by development level and workers
    const developmentMultiplier = 0.5 + resource.developmentLevel * 0.05;
    const workerEfficiency = Math.min(1, resource.workersAssigned / 10);
    return total + resource.monthlyYield * developmentMultiplier * workerEfficiency;
  }, 0);

  // Trade income based on settlements and location
  const tradeBase = territory.settlements.reduce((total, settlement) => {
    let multiplier = 1;
    switch (settlement.type) {
      case 'Village':
        multiplier = 1;
        break;
      case 'Town':
        multiplier = 3;
        break;
      case 'City':
        multiplier = 8;
        break;
      case 'Stronghold':
        multiplier = 2;
        break;
    }
    return total + settlement.population * 0.01 * multiplier;
  }, 0);

  // Simplification - in a real game, this would be more complex
  const trade = Math.floor(tradeBase);

  // Services income (inns, smiths, etc.)
  const services = territory.settlements.reduce((total, settlement) => {
    return total + settlement.services.length * 5;
  }, 0);

  // Miscellaneous income
  const other = Math.floor(territory.reputationScore * 0.5);

  // Calculate total
  const total = taxes + resources + trade + services + other;

  return {
    taxes,
    resources,
    trade,
    services,
    other,
    total,
  };
}

/**
 * Calculate monthly expenses for a territory
 */
export function calculateTerritoryExpenses(territory: Territory): TerritoryExpenses {
  // Wages for steward, lieutenants, and garrison
  let wages = 0;

  if (territory.steward) {
    wages += territory.steward.monthlyWage;

    // Add lieutenants' wages
    wages += territory.steward.lieutenants.reduce(
      (total, lieutenant) => total + lieutenant.monthlyWage,
      0
    );
  }

  // Add garrison wages
  wages += territory.garrison.monthlyCost;

  // Maintenance costs for fortifications
  const maintenance = territory.fortifications.reduce(
    (total, fortification) => total + fortification.maintenanceCost,
    0
  );

  // Supplies for population and garrison
  const suppliesPerPerson = 0.1; // 0.1 gp per person per month
  const supplies = Math.floor(territory.population * suppliesPerPerson);

  // Development costs (roads, buildings, etc.)
  // Placeholder - in a real game, this would be based on active projects
  const development = 0;

  // Miscellaneous expenses
  const other = Math.floor(territory.size * 0.5); // 0.5 gp per square mile

  // Calculate total
  const total = wages + maintenance + supplies + development + other;

  return {
    wages,
    maintenance,
    supplies,
    development,
    other,
    total,
  };
}

/**
 * Calculate net profit for a territory
 */
export function calculateTerritoryProfit(territory: Territory): number {
  const income = calculateTerritoryIncome(territory);
  const expenses = calculateTerritoryExpenses(territory);

  return income.total - expenses.total;
}

/**
 * Create a territory report for an absent player
 */
export interface TerritoryReport {
  territory: Territory;
  period: {
    startDate: number;
    endDate: number;
  };
  income: TerritoryIncome;
  expenses: TerritoryExpenses;
  netProfit: number;
  events: TerritoryEvent[];
  stewardActions: StewardAction[];
  threats: TerritoryThreat[];
  recommendations: string[];
}

/**
 * Events that occur in a territory
 */
export interface TerritoryEvent {
  type: string; // e.g., 'Attack', 'Disaster', 'Festival'
  date: number;
  description: string;
  impact: {
    population?: number;
    resources?: number;
    morale?: number;
    income?: number;
    expenses?: number;
  };
  resolution?: string;
}

/**
 * Actions taken by a steward
 */
export interface StewardAction {
  type: string; // e.g., 'Defense', 'Construction', 'Diplomacy'
  description: string;
  resources: number; // Resources expended
  success: boolean;
  outcome: string;
}

/**
 * Generate a territory report for the period a player is absent
 */
export function generateTerritoryReport(
  territory: Territory,
  startDate: number,
  endDate: number
): TerritoryReport {
  // Calculate income and expenses
  const income = calculateTerritoryIncome(territory);
  const expenses = calculateTerritoryExpenses(territory);
  const netProfit = income.total - expenses.total;

  // Generate events, steward actions, and threats
  // These would normally come from game simulation
  // Placeholder implementations for now
  const events: TerritoryEvent[] = [];
  const stewardActions: StewardAction[] = [];
  const threats = [...territory.threats];

  // Generate recommendations
  const recommendations: string[] = [];

  // Check for financial issues
  if (netProfit < 0) {
    recommendations.push(
      `Territory is running a deficit of ${Math.abs(netProfit)} gp per month. Consider raising taxes or reducing expenses.`
    );
  }

  // Check for threats
  const criticalThreats = threats.filter((threat) => threat.severity === 'Critical');
  if (criticalThreats.length > 0) {
    recommendations.push(
      `Critical threats require immediate attention: ${criticalThreats.map((t) => t.type).join(', ')}.`
    );
  }

  // Check for low garrison morale
  if (territory.garrison.morale < 50) {
    recommendations.push(
      `Garrison morale is low (${territory.garrison.morale}%). Consider improving conditions or rotating troops.`
    );
  }

  // Check for low population loyalty
  const lowLoyaltySettlements = territory.settlements.filter((s) => s.loyalty < 40);
  if (lowLoyaltySettlements.length > 0) {
    recommendations.push(
      `Low loyalty in settlements: ${lowLoyaltySettlements.map((s) => s.name).join(', ')}. Consider reducing taxes or improving conditions.`
    );
  }

  return {
    territory,
    period: {
      startDate,
      endDate,
    },
    income,
    expenses,
    netProfit,
    events,
    stewardActions,
    threats,
    recommendations,
  };
}

/**
 * Check for territory defense success during player absence
 */
export function checkTerritoryDefense(territory: Territory, threat: TerritoryThreat): boolean {
  // Calculate base defense strength
  let defenseStrength = territory.garrison.totalStrength;

  // Fortification bonus
  const fortificationBonus = territory.fortifications.reduce(
    (total, fort) => total + fort.defensiveValue,
    0
  );
  defenseStrength += fortificationBonus * 5;

  // Steward and lieutenant leadership bonus
  if (territory.steward) {
    defenseStrength += territory.steward.level * 10;

    // Add lieutenant bonuses
    defenseStrength += territory.steward.lieutenants.reduce((total, lt) => total + lt.level * 5, 0);

    // Steward loyalty check
    const loyaltyFactor = territory.steward.loyalty.currentScore / 100;
    defenseStrength = Math.floor(defenseStrength * loyaltyFactor);
  }

  // Morale factor
  const moraleFactor = territory.garrison.morale / 100;
  defenseStrength = Math.floor(defenseStrength * moraleFactor);

  // Calculate threat strength
  let threatStrength = 0;

  // Base threat severity
  switch (threat.severity) {
    case 'Low':
      threatStrength = 50;
      break;
    case 'Medium':
      threatStrength = 100;
      break;
    case 'High':
      threatStrength = 200;
      break;
    case 'Critical':
      threatStrength = 400;
      break;
  }

  // Random factor (±20%)
  const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
  threatStrength = Math.floor(threatStrength * randomFactor);

  // Compare strengths
  const defenseSuccess = defenseStrength >= threatStrength;

  return defenseSuccess;
}

/**
 * Create a new territory
 */
export function createTerritory(
  name: string,
  location: string,
  size: number,
  terrain: string,
  owner: Character // Owner is used for ownership records and permissions
): Territory {
  // Add a territory metadata field that includes owner information
  return {
    id: `territory-${Date.now()}`,
    name,
    location,
    size,
    terrain,
    ownerId: owner.id, // Track territory owner
    resources: [],
    settlements: [],
    population: 0,
    fortifications: [],
    income: {
      taxes: 0,
      resources: 0,
      trade: 0,
      services: 0,
      other: 0,
      total: 0,
    },
    expenses: {
      wages: 0,
      maintenance: 0,
      supplies: 0,
      development: 0,
      other: 0,
      total: 0,
    },
    threats: [],
    steward: null,
    garrison: {
      troops: [],
      totalStrength: 0,
      readiness: 50,
      morale: 50,
      monthlyCost: 0,
      equipment: {
        weapons: 'Average',
        armor: 'Average',
        supplies: 'Adequate',
        maintenanceNeeded: false,
      },
    },
    controlledSince: Date.now(), // Use current timestamp as placeholder
    reputationScore: 50, // Start at neutral
  };
}
