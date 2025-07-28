import type { Character, Monster } from '@rules/types';
import { performReactionRoll } from './reactionRolls';
import type { NPCAttitude, NPCAttitudeRecord, ReactionModifier } from './types';

/**
 * Class that manages NPC attitudes toward the player and other NPCs
 */
export class NPCAttitudeManager {
  private attitudes: NPCAttitudeRecord[] = [];

  /**
   * Record or update an NPC's attitude toward a target
   */
  public setAttitude(
    npcId: string,
    targetId: string,
    attitude: NPCAttitude,
    notes?: string
  ): NPCAttitudeRecord {
    const existingRecord = this.getAttitudeRecord(npcId, targetId);

    if (existingRecord) {
      // Update existing record
      existingRecord.attitude = attitude;
      existingRecord.notes = notes || existingRecord.notes;
      existingRecord.lastInteractionTime = Date.now(); // Use real time for simplicity
      return existingRecord;
    }
    // Create new record
    const newRecord: NPCAttitudeRecord = {
      npcId,
      targetId,
      attitude,
      notes,
      lastInteractionTime: Date.now(),
    };

    this.attitudes.push(newRecord);
    return newRecord;
  }

  /**
   * Get an NPC's current attitude toward a target
   */
  public getAttitude(npcId: string, targetId: string): NPCAttitude | null {
    const record = this.getAttitudeRecord(npcId, targetId);
    return record ? record.attitude : null;
  }

  /**
   * Get the detailed record for an NPC's attitude toward a target
   */
  private getAttitudeRecord(npcId: string, targetId: string): NPCAttitudeRecord | null {
    return (
      this.attitudes.find((record) => record.npcId === npcId && record.targetId === targetId) ||
      null
    );
  }

  /**
   * Get all attitude records for a specific NPC
   */
  public getAllAttitudesForNPC(npcId: string): NPCAttitudeRecord[] {
    return this.attitudes.filter((record) => record.npcId === npcId);
  }

  /**
   * Get all NPCs with a particular attitude toward a target
   */
  public getNPCsWithAttitude(targetId: string, attitude: NPCAttitude): string[] {
    return this.attitudes
      .filter((record) => record.targetId === targetId && record.attitude === attitude)
      .map((record) => record.npcId);
  }

  /**
   * Initialize an NPC's attitude toward a player with a reaction roll
   */
  public initializeAttitude(
    npc: Character | Monster,
    player: Character,
    additionalModifiers: ReactionModifier[] = []
  ): NPCAttitude {
    // Perform reaction roll to determine initial attitude
    const reactionResult = performReactionRoll({
      npc,
      player,
      modifiers: additionalModifiers,
      context: 'First Meeting',
    });

    // Set the attitude based on the reaction roll
    this.setAttitude(
      npc.id,
      player.id,
      reactionResult.attitude,
      `Initial meeting: ${reactionResult.description}`
    );

    return reactionResult.attitude;
  }

  /**
   * Adjust an NPC's attitude up or down based on player actions
   */
  public adjustAttitude(
    npcId: string,
    targetId: string,
    adjustment: number, // -2 = Very Negative, -1 = Negative, 0 = Neutral, 1 = Positive, 2 = Very Positive
    reason: string
  ): NPCAttitude {
    // Get current attitude
    let current = this.getAttitude(npcId, targetId);

    // If no attitude exists, default to Neutral
    if (!current) {
      current = 'Neutral';
    }

    // Map attitudes to a numeric scale for easier adjustment
    const attitudeScale: NPCAttitude[] = [
      'Hostile',
      'Unfriendly',
      'Neutral',
      'Friendly',
      'Helpful',
    ];

    // Find the current position on the scale
    let currentIndex = attitudeScale.indexOf(current);

    // Apply the adjustment
    currentIndex = Math.max(0, Math.min(attitudeScale.length - 1, currentIndex + adjustment));

    // Get the new attitude
    const newAttitude = attitudeScale[currentIndex];

    // Update the record with the new attitude and reason
    const existingRecord = this.getAttitudeRecord(npcId, targetId);
    const notes = existingRecord?.notes ? `${existingRecord.notes}; ${reason}` : reason;

    this.setAttitude(npcId, targetId, newAttitude, notes);

    return newAttitude;
  }

  /**
   * Get previous interaction modifier based on past relations
   */
  public getPreviousInteractionModifier(npcId: string, targetId: string): ReactionModifier {
    const currentAttitude = this.getAttitude(npcId, targetId);

    if (!currentAttitude) {
      return { value: 0, source: 'No Prior Interaction' };
    }

    // Convert attitude to modifier
    switch (currentAttitude) {
      case 'Hostile':
        return { value: -25, source: 'Previous Hostility' };
      case 'Unfriendly':
        return { value: -10, source: 'Previous Unfriendliness' };
      case 'Neutral':
        return { value: 0, source: 'Previous Neutrality' };
      case 'Friendly':
        return { value: 10, source: 'Previous Friendship' };
      case 'Helpful':
        return { value: 25, source: 'Previous Helpfulness' };
    }
  }
}

// Export a default singleton instance for easy access
export const npcAttitudeManager = new NPCAttitudeManager();

/**
 * Helper functions to describe attitudes in narrative text
 */
export function describeAttitude(attitude: NPCAttitude): string {
  switch (attitude) {
    case 'Hostile':
      return 'visibly hostile and aggressive toward you';
    case 'Unfriendly':
      return 'cold and distrustful of your presence';
    case 'Neutral':
      return 'neither friendly nor unfriendly toward you';
    case 'Friendly':
      return 'warm and receptive to your presence';
    case 'Helpful':
      return 'eager to assist you in your endeavors';
  }
}

/**
 * Get dialogue based on NPC attitude
 */
export function getAttitudeBasedDialogue(
  attitude: NPCAttitude,
  context: 'Greeting' | 'Request' | 'Information' | 'Farewell' = 'Greeting'
): string {
  const dialogues: Record<NPCAttitude, Record<string, string[]>> = {
    Hostile: {
      Greeting: [
        'What do YOU want?',
        'I have nothing to say to you.',
        "Leave me alone if you know what's good for you.",
      ],
      Request: ["I'd rather die than help you.", 'Not a chance.', 'You must be joking.'],
      Information: [
        'I know nothing that I would share with the likes of you.',
        'Figure it out yourself.',
        'Why would I tell you anything?',
      ],
      Farewell: ['Good riddance.', "Don't come back.", 'Next time bring an army.'],
    },
    Unfriendly: {
      Greeting: ['What is it?', 'Make it quick.', "I'm busy."],
      Request: ["What's in it for me?", "I don't do favors.", "That's going to cost you."],
      Information: [
        'I might know something... for a price.',
        "Information isn't free.",
        'Why should I tell you?',
      ],
      Farewell: ['Finally.', "Don't bother me again.", "We're done here."],
    },
    Neutral: {
      Greeting: ['Hello there.', 'Yes?', 'Can I help you?'],
      Request: [
        'I might be able to help with that.',
        'That depends on what you need.',
        "I'll consider it.",
      ],
      Information: [
        "Here's what I know...",
        'I can tell you this much...',
        'Let me think about what I know...',
      ],
      Farewell: ['Farewell.', 'Safe travels.', 'Until next time.'],
    },
    Friendly: {
      Greeting: ['Good to see you!', 'Welcome, friend!', 'How can I help today?'],
      Request: ["I'd be happy to help with that.", 'For you? Of course.', 'Consider it done.'],
      Information: [
        "I'll tell you everything I know.",
        "Here's something you might find useful...",
        "Let me share what I've heard...",
      ],
      Farewell: ['Take care, friend.', 'Come back anytime!', 'It was good speaking with you.'],
    },
    Helpful: {
      Greeting: [
        'My dear friend! So wonderful to see you!',
        "I've been hoping you'd visit!",
        'What an honor to have you here!',
      ],
      Request: [
        'It would be my pleasure to assist you!',
        'I insist on helping you with that!',
        "You needn't even ask, consider it done!",
      ],
      Information: [
        "I've been saving this information especially for you...",
        'Let me tell you a secret that few know...',
        "I've gathered all the details you might need...",
      ],
      Farewell: [
        'Please return soon, my door is always open to you!',
        'May the gods watch over you until we meet again!',
        'I shall count the days until your return!',
      ],
    },
  };

  // Get the appropriate dialogue list
  const options = dialogues[attitude][context];

  // Return a random option from the list
  return options[Math.floor(Math.random() * options.length)];
}
