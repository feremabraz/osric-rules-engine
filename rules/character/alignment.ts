import type { Alignment } from '@rules/types';

interface AlignmentDetails {
  name: Alignment;
  description: string;
  nicknames: string[];
  compatibleAlignments: Alignment[];
  naturalEnemies: Alignment[];
}

/**
 * Gets detailed information about a specific alignment
 */
export const getAlignmentDetails = (alignment: Alignment): AlignmentDetails => {
  const alignmentDetails: Record<Alignment, AlignmentDetails> = {
    'Lawful Good': {
      name: 'Lawful Good',
      description:
        'A lawful good character acts as a good person is expected or required to act. They combine a commitment to oppose evil with the discipline to fight relentlessly. They tell the truth, keep their word, help those in need, and speak out against injustice. A lawful good character hates to see the guilty go unpunished.',
      nicknames: ['Crusader'],
      compatibleAlignments: ['Lawful Good', 'Lawful Neutral', 'Neutral Good'],
      naturalEnemies: ['Chaotic Evil', 'Neutral Evil', 'Lawful Evil'],
    },
    'Lawful Neutral': {
      name: 'Lawful Neutral',
      description:
        'A lawful neutral character acts as law, tradition, or a personal code directs them. Order and organization are paramount. They may believe in personal order and live by a code or standard, or might believe in order for all, favoring a strong, organized government.',
      nicknames: ['Judge'],
      compatibleAlignments: ['Lawful Good', 'Lawful Neutral', 'Lawful Evil'],
      naturalEnemies: ['Chaotic Good', 'Chaotic Neutral', 'Chaotic Evil'],
    },
    'Lawful Evil': {
      name: 'Lawful Evil',
      description:
        'A lawful evil villain methodically takes what they want within the limits of their code of conduct without regard for whom it hurts. They care about tradition, loyalty, and order but not about freedom, dignity, or life. They play by the rules but without mercy or compassion.',
      nicknames: ['Dominator'],
      compatibleAlignments: ['Lawful Neutral', 'Lawful Evil', 'Neutral Evil'],
      naturalEnemies: ['Chaotic Good', 'Neutral Good', 'Lawful Good'],
    },
    'Neutral Good': {
      name: 'Neutral Good',
      description:
        'A neutral good character does the best that a good person can do. They are devoted to helping others. They work with kings and magistrates but do not feel beholden to them if they feel that their superiors are not serving the cause of good.',
      nicknames: ['Benefactor'],
      compatibleAlignments: ['Lawful Good', 'Neutral Good', 'Chaotic Good', 'True Neutral'],
      naturalEnemies: ['Lawful Evil', 'Neutral Evil', 'Chaotic Evil'],
    },
    'True Neutral': {
      name: 'True Neutral',
      description:
        'A neutral character has no strong allegiance to either good vs. evil or law vs. chaos. Most neutral characters exhibit a lack of conviction or bias rather than a commitment to neutrality. They see good as preferable to evil but may not act to uphold it without direct self-interest.',
      nicknames: ['Undecided', 'Balanced'],
      compatibleAlignments: [
        'Lawful Neutral',
        'Neutral Good',
        'True Neutral',
        'Neutral Evil',
        'Chaotic Neutral',
      ],
      naturalEnemies: [],
    },
    'Neutral Evil': {
      name: 'Neutral Evil',
      description:
        'A neutral evil villain does whatever they can get away with. They are out for themselves, pure and simple. They shed no tears for those they kill, whether for profit, sport, or convenience. They have no love of order and hold no illusion that following laws would make them any better or more noble.',
      nicknames: ['Malefactor'],
      compatibleAlignments: ['Lawful Evil', 'Neutral Evil', 'Chaotic Evil', 'True Neutral'],
      naturalEnemies: ['Lawful Good', 'Neutral Good', 'Chaotic Good'],
    },
    'Chaotic Good': {
      name: 'Chaotic Good',
      description:
        'A chaotic good character acts as their conscience directs, with little regard for what others expect. They make their own way, but they are generally kind and benevolent. They believe in goodness and personal honor, but have little use for laws and regulations.',
      nicknames: ['Rebel'],
      compatibleAlignments: ['Neutral Good', 'Chaotic Good', 'Chaotic Neutral'],
      naturalEnemies: ['Lawful Evil', 'Neutral Evil', 'Chaotic Evil'],
    },
    'Chaotic Neutral': {
      name: 'Chaotic Neutral',
      description:
        "A chaotic neutral character follows their whims. They are an individualist first and last. They value their own liberty but do not strive to protect others' freedom. They avoid authority, resent restrictions, and challenge traditions.",
      nicknames: ['Free Spirit'],
      compatibleAlignments: ['Chaotic Good', 'Chaotic Neutral', 'Chaotic Evil', 'True Neutral'],
      naturalEnemies: ['Lawful Good', 'Lawful Neutral', 'Lawful Evil'],
    },
    'Chaotic Evil': {
      name: 'Chaotic Evil',
      description:
        'A chaotic evil character does whatever their greed, hatred, and lust for destruction drive them to do. They are hot-tempered, vicious, arbitrarily violent, and unpredictable. If simply out for whatever they can get, they are ruthless and brutal. If committed to the spread of evil and chaos, they are even worse.',
      nicknames: ['Destroyer'],
      compatibleAlignments: ['Neutral Evil', 'Chaotic Evil', 'Chaotic Neutral'],
      naturalEnemies: ['Lawful Good', 'Neutral Good', 'Chaotic Good'],
    },
  };

  return alignmentDetails[alignment];
};

/**
 * Gets all available alignments
 */
export const getAllAlignments = (): Alignment[] => {
  return [
    'Lawful Good',
    'Neutral Good',
    'Chaotic Good',
    'Lawful Neutral',
    'True Neutral',
    'Chaotic Neutral',
    'Lawful Evil',
    'Neutral Evil',
    'Chaotic Evil',
  ];
};

/**
 * Checks if a character class is restricted to certain alignments
 */
export const getClassAlignmentRestrictions = (characterClass: string): Alignment[] => {
  const allowedAlignments: Record<string, Alignment[]> = {
    Fighter: getAllAlignments(),
    Paladin: ['Lawful Good'],
    Ranger: ['Lawful Good', 'Neutral Good', 'Chaotic Good'],
    'Magic-User': getAllAlignments(),
    Illusionist: getAllAlignments(),
    Cleric: getAllAlignments(), // Though typically matches deity's alignment
    Druid: ['True Neutral'], // Druids must be True Neutral in OSRIC
    Thief: getAllAlignments(),
    Assassin: ['Lawful Evil', 'Neutral Evil', 'Chaotic Evil'], // Assassins must be evil
  };

  return allowedAlignments[characterClass] || getAllAlignments();
};

/**
 * Checks if an alignment is compatible with a character class
 */
export const isAlignmentCompatibleWithClass = (
  alignment: Alignment,
  characterClass: string
): boolean => {
  const allowedAlignments = getClassAlignmentRestrictions(characterClass);
  return allowedAlignments.includes(alignment);
};

/**
 * Gets a character's alignment language
 */
export const getAlignmentLanguage = (alignment: Alignment): string => {
  // Alignment languages are named after the alignment
  return `${alignment} Tongue`;
};

/**
 * Determines if two alignments are generally compatible (can work together)
 */
export const areAlignmentsCompatible = (alignment1: Alignment, alignment2: Alignment): boolean => {
  if (alignment1 === alignment2) {
    return true;
  }

  const details = getAlignmentDetails(alignment1);
  return details.compatibleAlignments.includes(alignment2);
};

/**
 * Determines if two alignments are naturally adversarial
 */
export const areAlignmentsAdversarial = (alignment1: Alignment, alignment2: Alignment): boolean => {
  const details = getAlignmentDetails(alignment1);
  return details.naturalEnemies.includes(alignment2);
};

/**
 * Determines reaction adjustment between creatures of different alignments
 * Returns a negative modifier for opposing alignments, positive for compatible ones
 */
export const getAlignmentReactionModifier = (
  alignment1: Alignment,
  alignment2: Alignment
): number => {
  if (alignment1 === alignment2) {
    return +2; // Same alignment - positive reaction
  }

  if (areAlignmentsCompatible(alignment1, alignment2)) {
    return +1; // Compatible alignments - slightly positive
  }

  if (areAlignmentsAdversarial(alignment1, alignment2)) {
    return -3; // Enemy alignments - very negative
  }

  // Check if they differ on both axes (law/chaos and good/evil)
  const axis1 = alignment1.split(' ');
  const axis2 = alignment2.split(' ');

  if (axis1[0] !== axis2[0] && axis1[1] !== axis2[1]) {
    return -2; // Different on both axes - negative
  }

  return -1; // Different on one axis - slightly negative
};
