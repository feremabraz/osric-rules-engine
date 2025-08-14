import { z } from 'zod';

export interface ItemDraft {
  name: string;
  kind: string;
}
export interface Item extends ItemDraft {
  id: string;
  createdAt: number;
  updatedAt: number;
}

export const ItemDraftSchema: z.ZodType<ItemDraft> = z.object({
  name: z.string().min(1),
  kind: z.string().min(1),
});

export function prepare(init: Partial<ItemDraft>): ItemDraft {
  const parsed = ItemDraftSchema.parse({
    name: init.name ?? 'Item',
    kind: init.kind ?? 'generic',
  });
  return Object.freeze(parsed);
}

export const item = Object.freeze({ prepare });
