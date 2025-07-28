import {
  areAlignmentsAdversarial,
  areAlignmentsCompatible,
  getAlignmentDetails,
  getAlignmentLanguage,
  getAlignmentReactionModifier,
  getAllAlignments,
  getClassAlignmentRestrictions,
  isAlignmentCompatibleWithClass,
} from '@rules/character/alignment';
import { describe, expect, it } from 'vitest';

describe('Alignment System', () => {
  describe('getAlignmentDetails', () => {
    it('should return details for Lawful Good alignment', () => {
      const details = getAlignmentDetails('Lawful Good');

      expect(details.name).toBe('Lawful Good');
      expect(details.description).toBeDefined();
      expect(details.description.length).toBeGreaterThan(20);
      expect(details.nicknames).toContain('Crusader');
      expect(details.compatibleAlignments).toContain('Lawful Neutral');
      expect(details.naturalEnemies).toContain('Chaotic Evil');
    });

    it('should return details for Chaotic Evil alignment', () => {
      const details = getAlignmentDetails('Chaotic Evil');

      expect(details.name).toBe('Chaotic Evil');
      expect(details.description).toBeDefined();
      expect(details.compatibleAlignments).toContain('Chaotic Neutral');
      expect(details.naturalEnemies).toContain('Lawful Good');
    });
  });

  describe('getAllAlignments', () => {
    it('should return all nine alignments', () => {
      const alignments = getAllAlignments();

      expect(alignments).toHaveLength(9);
      expect(alignments).toContain('Lawful Good');
      expect(alignments).toContain('True Neutral');
      expect(alignments).toContain('Chaotic Evil');
    });
  });

  describe('getClassAlignmentRestrictions', () => {
    it('should return only Lawful Good for Paladins', () => {
      const allowedAlignments = getClassAlignmentRestrictions('Paladin');

      expect(allowedAlignments).toHaveLength(1);
      expect(allowedAlignments).toEqual(['Lawful Good']);
    });

    it('should return only True Neutral for Druids', () => {
      const allowedAlignments = getClassAlignmentRestrictions('Druid');

      expect(allowedAlignments).toHaveLength(1);
      expect(allowedAlignments).toEqual(['True Neutral']);
    });

    it('should return only evil alignments for Assassins', () => {
      const allowedAlignments = getClassAlignmentRestrictions('Assassin');

      expect(allowedAlignments).toHaveLength(3);
      expect(allowedAlignments).toContain('Lawful Evil');
      expect(allowedAlignments).toContain('Neutral Evil');
      expect(allowedAlignments).toContain('Chaotic Evil');
      expect(allowedAlignments).not.toContain('Lawful Good');
    });

    it('should return all alignments for Fighters', () => {
      const allowedAlignments = getClassAlignmentRestrictions('Fighter');

      expect(allowedAlignments).toHaveLength(9);
    });
  });

  describe('isAlignmentCompatibleWithClass', () => {
    it('should return true for compatible combinations', () => {
      expect(isAlignmentCompatibleWithClass('Lawful Good', 'Paladin')).toBe(true);
      expect(isAlignmentCompatibleWithClass('Lawful Good', 'Fighter')).toBe(true);
      expect(isAlignmentCompatibleWithClass('True Neutral', 'Druid')).toBe(true);
    });

    it('should return false for incompatible combinations', () => {
      expect(isAlignmentCompatibleWithClass('Chaotic Evil', 'Paladin')).toBe(false);
      expect(isAlignmentCompatibleWithClass('Lawful Good', 'Assassin')).toBe(false);
      expect(isAlignmentCompatibleWithClass('Lawful Neutral', 'Druid')).toBe(false);
    });
  });

  describe('getAlignmentLanguage', () => {
    it('should return the alignment name followed by Tongue', () => {
      expect(getAlignmentLanguage('Lawful Good')).toBe('Lawful Good Tongue');
      expect(getAlignmentLanguage('Chaotic Evil')).toBe('Chaotic Evil Tongue');
    });
  });

  describe('areAlignmentsCompatible', () => {
    it('should return true for the same alignment', () => {
      expect(areAlignmentsCompatible('Lawful Good', 'Lawful Good')).toBe(true);
    });

    it('should return true for compatible alignments', () => {
      expect(areAlignmentsCompatible('Lawful Good', 'Lawful Neutral')).toBe(true);
      expect(areAlignmentsCompatible('Chaotic Neutral', 'Chaotic Evil')).toBe(true);
    });

    it('should return false for incompatible alignments', () => {
      expect(areAlignmentsCompatible('Lawful Good', 'Chaotic Evil')).toBe(false);
      expect(areAlignmentsCompatible('Lawful Neutral', 'Chaotic Neutral')).toBe(false);
    });
  });

  describe('areAlignmentsAdversarial', () => {
    it('should return true for opposing alignments', () => {
      expect(areAlignmentsAdversarial('Lawful Good', 'Chaotic Evil')).toBe(true);
      expect(areAlignmentsAdversarial('Lawful Good', 'Lawful Evil')).toBe(true);
    });

    it('should return false for non-opposing alignments', () => {
      expect(areAlignmentsAdversarial('Lawful Good', 'Lawful Good')).toBe(false);
      expect(areAlignmentsAdversarial('Lawful Good', 'Lawful Neutral')).toBe(false);
    });
  });

  describe('getAlignmentReactionModifier', () => {
    it('should return positive modifier for same alignment', () => {
      expect(getAlignmentReactionModifier('Lawful Good', 'Lawful Good')).toBe(2);
    });

    it('should return positive modifier for compatible alignments', () => {
      expect(getAlignmentReactionModifier('Lawful Good', 'Lawful Neutral')).toBe(1);
    });

    it('should return very negative modifier for opposing alignments', () => {
      expect(getAlignmentReactionModifier('Lawful Good', 'Chaotic Evil')).toBe(-3);
    });

    it('should return negative modifier for differing on both axes', () => {
      expect(getAlignmentReactionModifier('Lawful Good', 'Chaotic Neutral')).toBe(-2);
    });

    it('should return slightly negative modifier for differing on one axis', () => {
      // Testing with alignments that aren't explicitly compatible or enemies
      // and differ on only one axis (law vs. chaos)
      expect(getAlignmentReactionModifier('Lawful Neutral', 'Neutral Good')).toBe(-2);
    });
  });
});
