import { z } from 'zod';

// Phase 02: Expand item meta to support combat (weapons & armor)
export type WeaponKey = 'sword' | 'mace' | 'dagger' | 'unarmed';
export type ArmorKey = 'chain' | 'leather' | 'none';

export interface WeaponMeta {
  key: WeaponKey;
  type: 'weapon';
  damage: { dice: 'd2' | 'd4' | 'd6' | 'd8'; bonus: number }; // simplify
  weightKg: number;
  finesse?: boolean; // allows DEX mod instead of STR
  attackBonus?: number; // magic or quality
  // Optional weapon vs armor adjustment table. Key = armorTypeKey, value = attack bonus applied when target wears that armor type.
  weaponVsArmor?: Readonly<Record<string, number>>;
}
export interface ArmorMeta {
  key: ArmorKey;
  type: 'armor';
  armorClassBase: number; // bonus added to 10 (ascending AC model)
  initiativePenalty?: number; // negative penalty applied to initiative base
  weightKg: number;
  // Armor classification used by weapon vs armor table lookups.
  armorTypeKey: string;
}

export type ItemMeta = WeaponMeta | ArmorMeta;

export type ItemKind = 'generic' | 'weapon' | 'armor';
export interface ItemDraft {
  name: string;
  kind: ItemKind;
}
export interface Item extends ItemDraft {
  id: string;
  createdAt: number;
  updatedAt: number;
}

export const ItemDraftSchema: z.ZodType<ItemDraft> = z.object({
  name: z.string().min(1),
  kind: z.enum(['generic', 'weapon', 'armor']),
});

export function prepare(init: Partial<ItemDraft>): ItemDraft {
  const parsed = ItemDraftSchema.parse({
    name: init.name ?? 'Item',
    kind: init.kind ?? 'generic',
  });
  return Object.freeze(parsed);
}

// Minimal fixed catalogs
const weapons: Record<WeaponKey, WeaponMeta> = Object.freeze({
  sword: Object.freeze({
    key: 'sword',
    type: 'weapon',
    damage: { dice: 'd6' as const, bonus: 0 },
    weightKg: 1.5,
    weaponVsArmor: Object.freeze({ chain: 2, leather: 0, none: 0 }), // example: swords excel vs chain
  }),
  mace: Object.freeze({
    key: 'mace',
    type: 'weapon',
    damage: { dice: 'd6' as const, bonus: 0 },
    weightKg: 2.0,
    weaponVsArmor: Object.freeze({ chain: 1 }),
  }),
  dagger: Object.freeze({
    key: 'dagger',
    type: 'weapon',
    damage: { dice: 'd4' as const, bonus: 0 },
    weightKg: 0.5,
    finesse: true,
    weaponVsArmor: Object.freeze({ chain: -1, leather: 0, none: 0 }), // harder vs chain
  }),
  unarmed: Object.freeze({
    key: 'unarmed',
    type: 'weapon',
    damage: { dice: 'd2' as const, bonus: 0 },
    weightKg: 0,
  }),
});
const armors: Record<ArmorKey, ArmorMeta> = Object.freeze({
  chain: Object.freeze({
    key: 'chain',
    type: 'armor',
    armorClassBase: 4,
    initiativePenalty: -1,
    weightKg: 12,
    armorTypeKey: 'chain',
  }),
  leather: Object.freeze({
    key: 'leather',
    type: 'armor',
    armorClassBase: 2,
    initiativePenalty: 0,
    weightKg: 8,
    armorTypeKey: 'leather',
  }),
  none: Object.freeze({
    key: 'none',
    type: 'armor',
    armorClassBase: 0,
    initiativePenalty: 0,
    weightKg: 0,
    armorTypeKey: 'none',
  }),
});

export const item = Object.freeze({ prepare, weapons, armors });
