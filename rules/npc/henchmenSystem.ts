import { roll } from '@rules/utils/dice';
import type { Character, CharacterClass, Item } from '../types';
import type { LoyaltyRecord } from './loyaltySystem';
import { createLoyaltyRecord } from './loyaltySystem';

/**
 * Recruitment methods for finding henchmen
 */
export const RecruitmentMethods = [
  'Tavern',
  'Guild',
  'Crier',
  'Notice',
  'Agent',
  'Recommendation',
] as const;

export type RecruitmentMethod = (typeof RecruitmentMethods)[number];

/**
 * Terms offered to potential henchmen
 */
export interface HenchmanOffer {
  goldPayment: number; // Monthly payment in gold
  equipmentProvided: Item[]; // Equipment provided to the henchman
  magicItemsOffered: Item[]; // Magic items provided (if any)
  roomAndBoard: boolean; // Whether room and board is provided
  treasureShare: number; // Percentage of treasure share (usually 10-20%)
  dangerLevel: 'Low' | 'Medium' | 'High' | 'Extreme'; // Expected danger
  duties: string[]; // Expected duties
  specialTerms: string[]; // Any special terms of service
}

/**
 * Result of a henchman recruitment attempt
 */
export interface RecruitmentResult {
  success: boolean;
  candidates: HenchmanCandidate[];
  timeSpent: number; // In days
  goldSpent: number;
  notes: string;
}

/**
 * A potential henchman candidate
 */
export interface HenchmanCandidate {
  character: Character;
  expectedOffer: HenchmanOffer;
  interestLevel: number; // 0-100, higher is more interested
  acceptanceThreshold: number; // Minimum offer quality needed for acceptance
  specialRequirements: string[];
}

/**
 * Parameters for recruiting henchmen
 */
export interface RecruitmentParams {
  recruitingCharacter: Character;
  recruitmentMethod: RecruitmentMethod;
  locationQuality: 'Poor' | 'Average' | 'Good' | 'Excellent';
  desiredClass?: CharacterClass;
  minLevel?: number;
  maxLevel?: number;
  specificSkills?: string[];
  timeInvested: number; // In days
  goldInvested: number;
  charismaAdjustment: number; // Modifier based on charisma
}

/**
 * Calculate the cost of a recruitment method
 */
export function calculateRecruitmentCost(
  method: RecruitmentMethod,
  locationQuality: string
): number {
  // Base costs in gold pieces
  const baseCosts: Record<RecruitmentMethod, number> = {
    Tavern: 5,
    Guild: 50,
    Crier: 15,
    Notice: 10,
    Agent: 100,
    Recommendation: 25,
  };

  // Location quality multipliers
  const qualityMultipliers: Record<string, number> = {
    Poor: 0.5,
    Average: 1.0,
    Good: 1.5,
    Excellent: 2.5,
  };

  return baseCosts[method] * qualityMultipliers[locationQuality];
}

/**
 * Calculate the effectiveness of a recruitment method
 */
export function calculateRecruitmentEffectiveness(params: RecruitmentParams): number {
  const { recruitmentMethod, locationQuality, timeInvested, goldInvested, charismaAdjustment } =
    params;

  // Base effectiveness percentages
  const baseEffectiveness: Record<RecruitmentMethod, number> = {
    Tavern: 30,
    Guild: 60,
    Crier: 40,
    Notice: 25,
    Agent: 75,
    Recommendation: 50,
  };

  // Location quality modifiers
  const qualityModifiers: Record<string, number> = {
    Poor: -15,
    Average: 0,
    Good: +10,
    Excellent: +25,
  };

  // Calculate base chance of finding suitable candidates
  let effectiveness = baseEffectiveness[recruitmentMethod] + qualityModifiers[locationQuality];

  // Time invested (diminishing returns after 5 days)
  effectiveness += Math.min(timeInvested * 5, 25);

  // Gold invested (diminishing returns)
  const baseCost = calculateRecruitmentCost(recruitmentMethod, locationQuality);
  const goldMultiplier = goldInvested / baseCost;
  effectiveness += Math.min(Math.floor(goldMultiplier * 10), 30);

  // Charisma adjustment
  effectiveness += charismaAdjustment;

  // Adjust for specific requirements
  if (params.desiredClass) effectiveness -= 10;
  if (params.minLevel && params.minLevel > 3) effectiveness -= (params.minLevel - 3) * 10;
  if (params.specificSkills && params.specificSkills.length > 0) {
    effectiveness -= params.specificSkills.length * 5;
  }

  // Ensure reasonable bounds
  return Math.min(Math.max(effectiveness, 5), 95);
}

/**
 * Process a henchman recruitment attempt
 */
export function recruitHenchmen(params: RecruitmentParams): RecruitmentResult {
  const effectiveness = calculateRecruitmentEffectiveness(params);
  const success = roll(100) <= effectiveness;

  // Determine number of candidates found
  let candidateCount = 0;
  if (success) {
    // More effective methods find more candidates
    const baseCount = Math.floor(effectiveness / 20);
    candidateCount = Math.max(1, roll(4) + baseCount - 2);
  }

  // Create the candidates
  const candidates: HenchmanCandidate[] = [];

  // Implementation note: In a real game, this would generate actual
  // Character instances based on the parameters.
  // For this example, we'll return placeholder objects.

  // Time and gold spent
  const timeSpent = params.timeInvested;
  const goldSpent = params.goldInvested;

  const notes = success
    ? `Recruitment successful! Found ${candidateCount} potential henchmen.`
    : 'Recruitment failed. Consider trying a different method or location.';

  return {
    success,
    candidates,
    timeSpent,
    goldSpent,
    notes,
  };
}

/**
 * Calculate the quality of an offer made to a henchman
 */
export function calculateOfferQuality(offer: HenchmanOffer, candidate: HenchmanCandidate): number {
  let quality = 50; // Base quality

  // Gold payment
  const expectedGold = candidate.expectedOffer.goldPayment;
  const goldRatio = offer.goldPayment / expectedGold;
  quality += Math.min(Math.floor((goldRatio - 1) * 20), 30);

  // Equipment
  if (offer.equipmentProvided.length >= candidate.expectedOffer.equipmentProvided.length) {
    quality += 10;
  } else {
    quality -= 15;
  }

  // Magic items are highly valued
  if (offer.magicItemsOffered.length > 0) {
    quality += offer.magicItemsOffered.length * 15;
  }

  // Room and board
  if (offer.roomAndBoard && candidate.expectedOffer.roomAndBoard) {
    quality += 5;
  } else if (offer.roomAndBoard && !candidate.expectedOffer.roomAndBoard) {
    quality += 10;
  } else if (!offer.roomAndBoard && candidate.expectedOffer.roomAndBoard) {
    quality -= 15;
  }

  // Treasure share
  const expectedShare = candidate.expectedOffer.treasureShare;
  const shareRatio = offer.treasureShare / expectedShare;
  quality += Math.min(Math.floor((shareRatio - 1) * 25), 30);

  // Danger level
  const dangerLevels = ['Low', 'Medium', 'High', 'Extreme'];
  const offerDangerIndex = dangerLevels.indexOf(offer.dangerLevel);
  const expectedDangerIndex = dangerLevels.indexOf(candidate.expectedOffer.dangerLevel);

  if (offerDangerIndex > expectedDangerIndex) {
    quality -= (offerDangerIndex - expectedDangerIndex) * 15;
  }

  // Special requirements
  for (const requirement of candidate.specialRequirements) {
    if (offer.specialTerms.includes(requirement)) {
      quality += 10;
    } else {
      quality -= 15;
    }
  }

  return Math.min(Math.max(quality, 1), 100);
}

/**
 * Determine if a candidate accepts an offer
 */
export function offerAccepted(
  offer: HenchmanOffer,
  candidate: HenchmanCandidate,
  recruiter: Character
): boolean {
  const offerQuality = calculateOfferQuality(offer, candidate);

  // Charisma-based adjustment
  let charismaAdjustment = 0;
  if (recruiter.abilityModifiers.charismaReactionAdj) {
    charismaAdjustment = recruiter.abilityModifiers.charismaReactionAdj;
  }

  const threshold = candidate.acceptanceThreshold - charismaAdjustment;

  return offerQuality >= threshold;
}

/**
 * Create a henchman relationship
 */
export interface HenchmanRelationship {
  henchman: Character;
  master: Character;
  startDate: number; // Game time when relationship started
  contractLength: number; // In months, 0 for indefinite
  terms: HenchmanOffer;
  loyalty: LoyaltyRecord;
  experienceGained: number;
  adventuresSurvived: number;
  specialNotes: string[];
}

/**
 * Create a new henchman relationship
 */
export function createHenchmanRelationship(
  henchman: Character,
  master: Character,
  contractLength: number,
  terms: HenchmanOffer
): HenchmanRelationship {
  const loyaltyRecord = createLoyaltyRecord(henchman, master);

  return {
    henchman,
    master,
    startDate: Date.now(), // Use current timestamp as placeholder
    contractLength,
    terms,
    loyalty: loyaltyRecord,
    experienceGained: 0,
    adventuresSurvived: 0,
    specialNotes: [],
  };
}

/**
 * Manage henchman level advancement
 */
export function advanceHenchman(
  relationship: HenchmanRelationship,
  experienceGained: number
): HenchmanRelationship {
  // Update experience
  const updatedExperience = relationship.experienceGained + experienceGained;

  // Check if henchman should level up
  const henchman = relationship.henchman;
  const requiredForNextLevel = henchman.experience.requiredForNextLevel;

  const updatedHenchman = { ...henchman };

  if (updatedExperience >= requiredForNextLevel) {
    // In a real game, this would call a proper character leveling function
    updatedHenchman.level += 1;
    // Reset experience and set new level requirements
    updatedHenchman.experience = {
      ...updatedHenchman.experience,
      level: updatedHenchman.level,
      current: 0,
      requiredForNextLevel: requiredForNextLevel * 2, // Simplified progression
    };
  } else {
    // Just update current experience
    updatedHenchman.experience = {
      ...updatedHenchman.experience,
      current: updatedHenchman.experience.current + experienceGained,
    };
  }

  return {
    ...relationship,
    henchman: updatedHenchman,
    experienceGained: updatedExperience,
  };
}
