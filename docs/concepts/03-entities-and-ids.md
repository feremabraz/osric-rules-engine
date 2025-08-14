# 3. Entities & IDs

Prior: Configuration & Startup (2). Now we cover the in‑memory world model.

## Entity Types
Currently supported entity domains:
- Character
- Monster
- Item

Each entity has a *draft* shape (validated + immutable) and a *stored* shape (adds `id`, timestamps). Drafts are prepared via catalog helpers and then persisted using the Store.

### Character
Key static metadata objects (race, class) are exposed directly on `engine.entities.character` (e.g. `engine.entities.character.human`). A `prepare(race, class, init)` function returns a frozen `CharacterDraft` with defaults (`level=1`, full hit die HP, `xp=0`).

### Monster / Item
Simpler drafts with minimal defaults (`level=1`, `hp=1`; `kind='generic'`).

## IDs
IDs are branded template literal strings enforcing domain separation at the type level:
- `CharacterId`: `char_<random>`
- `MonsterId`: `mon_<random>`
- `ItemId`: `itm_<random>`

Helper factories (`createCharacterId`, etc.) are used internally by the Store when persisting drafts; you can also import them for custom flows.

## Immutability
All metadata and drafts are frozen (`Object.freeze`) to prevent accidental mutation prior to persistence. Store updates replace whole records (copy‑on‑write) and freeze the new version.

Next: Store & World State (4).
