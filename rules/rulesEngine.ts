/**
 * OSRIC Rules Engine
 *
 * This is the main entry point for the OSRIC rules implementation.
 * It exports all the rules modules in a structured way.
 *
 * All measurements have been converted to metric units:
 * - Distances in meters instead of feet
 * - Weights in kilograms instead of pounds (1 pound = 0.5 kg)
 * - Volumes in liters instead of gallons
 */

// Export all spell-related functionality
import * as Spells from '@rules/spells';
export { Spells };

// Export all types
export * from '@rules/types';

// Export dice system
export * as Dice from '@rules/dice';

// Export time system (when implemented)
// export * from '@rules/time';

// Export character creation (when implemented)
// export * from '@rules/character';

// Export combat system (when implemented)
// export * from '@rules/combat';

// Export movement and exploration (when implemented)
// export * from '@rules/travel';

// Export environment handling (when implemented)
// export * from '@rules/environment';

/**
 * Action context interface for the rule engine
 */
export interface ActionContext {
  actor?: string;
  targets?: string[];
  location?: string;
  [key: string]: unknown;
}

/**
 * Action result interface
 */
export interface ActionResult {
  success: boolean;
  message: string;
  details: Record<string, unknown>;
}

/**
 * Process a game action according to the rules
 * This will be expanded as more rule systems are implemented
 *
 * @param action The action to process
 * @param context The context in which the action is performed
 * @returns The result of the action
 */
export function resolveAction(action: string, _context: ActionContext): ActionResult {
  // This is a placeholder for a more comprehensive action resolution system
  // It will delegate to specific rule systems based on the action type

  // For now, we just log the action
  console.log(`Processing action: ${action}`);

  // Return a dummy result
  return {
    success: true,
    message: `Action "${action}" processed successfully.`,
    details: {},
  };
}
