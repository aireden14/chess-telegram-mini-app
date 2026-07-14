# Fable World — data contract

This folder is the source of truth for the standalone MVP.

- `technologies.json`: 28-node, level-gated technology graph through level 30.
- `items.json`: resource tiers, buildings, and production recipes.
- `fables.json`: 20 original species across five biomes, combat scaling, elements, and 12 work roles.
- `biomes.json`: world order, expected level bands, resource gates, hazards, and landmarks.
- `balance.json`: explicit combat, capture, economy, and automation targets.

The game must not depend on Palworld names, art, story, map, or exact numerical tables. Palworld was used only as a systems reference. All player-facing species, world, resource, and technology names here are original to Fable World.

## MVP loop

1. Gather wood, stone, fibre, berries, and aether by hand.
2. Craft a sphere, weaken and catch a first Fable.
3. Decide whether the Fable joins the active party or works at the base.
4. Build a matching worksite and automate a bottleneck.
5. Spend knowledge, craft stronger spheres, enter the next biome, and catch a new specialist.
6. Repeat until the base can sustain the expedition into Starfrost.

## Invariants

- Player level 2 can beat a level 3 creature with good movement.
- A level 2 player cannot beat an ordinary level 20 creature with starter gear.
- Every biome introduces at least one new resource gate and one new worker specialization.
- Capturing and automation feed each other: no separate “factory mode” and “creature mode.”
- Saves are local-first for the MVP and versioned for future server migration.
