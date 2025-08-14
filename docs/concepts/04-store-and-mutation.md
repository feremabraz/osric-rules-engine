# 4. Store & Mutation Model

Prior: Entities & IDs (3). Now the Store: a lightweight facade managing entity lifecycle.

## StoreFacade Responsibilities
- Persist drafts (assign ID + timestamps)
- Retrieve entities by id & type
- Apply validated partial updates (copy‑on‑write)
- Remove entities
- Produce snapshots for inspection/testing

### API Surface
```
setEntity(type, draft) => Id
getEntity(type, id) => Entity | null
updateEntity(type, id, patch) => Entity
removeEntity(type, id) => boolean
snapshot() => { characters: Character[]; monsters: Monster[]; items: Item[] }
```

### Validation
Current validation logic is minimal (e.g. character `hp` must remain >= 0). Future invariants can be centralized here.

### Mutation Strategy
All records are frozen. An update builds a new frozen object and swaps it in the internal Map; consumers never mutate entities directly.

## Interaction With Commands
Rules read and patch entities through the Store. They must provide correct `type` strings (`'character' | 'monster' | 'item'`). Errors (e.g. missing entity) become domain failures when authors use `ctx.fail()` (see Execution Context later).

Next: Commands & Rules (5).
