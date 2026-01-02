# Mirror King Boss Implementation

## Overview
Implemented the Mirror King final boss with 6 unique summons, two-phase mechanics, conditional resurrection, and complex battle interactions.

## Mirror King Stats
- **Mask ID:** 90000
- **Name:** The Mirror King
- **Phase 1:**
  - Attack Damage: 300
  - Ability Damage: 250
  - Protections: 200
  - Magic Resist: 200
  - Health: 5000
  - Speed: 80

- **Phase 2 (triggers when all summons are dead):**
  - All stats doubled (×2 multiplier)
  - Switches to Ability Damage focused skills
  - Resummons all 6 summons with 2× stats

## Mirror King Mechanics

### Immortality System
- **While summons alive:** Mirror King heals to full health every turn, cannot die
- **On death attempt:** Checks if any summons are alive
  - If yes: Heals to full, displays message
  - If no: Allows death or triggers Phase 2

### Phase Transition
- Triggers when Mirror King dies AND all summons are dead
- Doubles all stats (Attack, Ability, Protections, Magic Resist, Health)
- Heals to full health
- Switches active skills from Phase 1 to Phase 2
- Resummons all 6 summons with 2× their original stats

## Phase 1 Skills

### King's Decree (Skill ID: 900000)
- **Type:** Active (requires speed = 100)
- **Effect:** Massive single-target Attack Damage strike
- **Damage:** 3× Attack Damage (minimum 2× if protections reduce it)
- **Targets:** Random enemy, untargetable excluded

### Commanding Presence (Skill ID: 900001)
- **Type:** Passive
- **Effect:** Buffs all summons
- **Buff:** +20% Attack Damage, +10% Ability Damage (based on King's Ability Damage)
- **Targets:** All allied summons

## Phase 2 Skills

### Cataclysmic Reflection (Skill ID: 900010)
- **Type:** Active (requires speed = 100)
- **Effect:** Devastating AoE Ability Damage
- **Damage:** 2× Ability Damage (minimum 1× if magic resist reduces it)
- **Additional Effects:**
  - Adds 2 stun stacks to all enemies
  - Adds 3 burn stacks to all enemies
- **Targets:** All enemies

### Royal Restoration (Skill ID: 900011)
- **Type:** Passive
- **Effect:** Heals and empowers all summons
- **Healing:** 2× Ability Damage
- **Buff:** +30% Protections, +30% Magic Resist (based on King's Ability Damage)
- **Targets:** All allied summons

## Summons

### 1. Shattered Reflection (ID: 90001)
**Stats:** ATK 150, Abil 100, Prot 80, MR 80, HP 1200, Speed 100

**Skills:**
- **Mirror Shards (900002)** - Active: Hits 3 random enemies for 0.8× Attack Damage, adds 2 bleed stacks each
- **Reflective Barrier (900003)** - Passive: Increases all allies' Protections and Magic Resist by 0.2× Ability Damage

### 2. Fractured Echo (ID: 90002)
**Stats:** ATK 120, Abil 120, Prot 70, MR 70, HP 1000, Speed 100

**Skills:**
- **Echo Strike (900004)** - Active: 1.2× Attack Damage, 50% chance to hit again for 70% damage
- **Reverberating Wounds (900005)** - Passive: Applies 3 poison stacks and 2 bleed stacks to all enemies

### 3. Glass Phantom (ID: 90003)
**Stats:** ATK 140, Abil 80, Prot 60, MR 60, HP 900, Speed 120

**Skills:**
- **Phantom Slice (900006)** - Active: 1.5× Attack Damage + 5 bleed stacks
- **Vanish (900007)** - Passive: Becomes untargetable for 2 turns

### 4. Crystal Guardian (ID: 90004)
**Stats:** ATK 100, Abil 100, Prot 120, MR 120, HP 1500, Speed 80

**Skills:**
- **Crystal Crush (900008)** - Active: 1.3× Attack Damage + 1 stun stack
- **Fortify (900009)** - Passive: Increases all allies' Protections by 0.3× and Magic Resist by 0.15× Ability Damage

### 5. Prismatic Shadow (ID: 90005)
**Stats:** ATK 110, Abil 150, Prot 50, MR 50, HP 800, Speed 110

**Skills:**
- **Shadow Bolt (900020)** - Active: 1.8× Ability Damage magic attack
- **Drain Essence (900021)** - Passive: Drains 0.3× Ability Damage from all enemies, heals self for total drained

### 6. Refracted Soul (ID: 90006)
**Stats:** ATK 130, Abil 130, Prot 90, MR 90, HP 1100, Speed 100

**Skills:**
- **Soul Rend (900022)** - Active: 1.6× Ability Damage, reduces target's Magic Resist by 20%
- **Link Fate (900023)** - Passive: Redistributes health evenly among all allied units

## Implementation Details

### Backend Changes

#### server.js
1. **Mirror King Immortality Check** (lines 3257-3298):
   - Runs at start of each /continue cycle
   - Checks if Mirror King died
   - If summons alive: Heals to full
   - If summons dead: Triggers Phase 2 transformation
   
2. **Phase 2 Transformation**:
   - Doubles all stats
   - Changes activeSkills array to Phase 2 skills
   - Resummons all 6 summons with 2× stats
   - Sets phase2Active flag

3. **Healing While Summons Alive** (lines 3300-3311):
   - Every turn, checks if Mirror King is damaged
   - If any summons alive: Heals to full
   - Shows message 30% of time to avoid spam

4. **Skill Implementations** (lines 5036-5330):
   - All 4 Mirror King skills
   - All 12 summon skills (2 per summon)
   - Each skill with proper damage calculations, targeting, and effects

5. **Skill Name Mappings** (lines 3237-3252):
   - Maps skill IDs to readable skill names for battle messages

6. **Default Masks** (lines 288-402):
   - Added Mirror King and all 6 summons to default masks
   - Includes stats, photos, and skill assignments

#### MaskList.js Model
- Added `name` field (TEXT, nullable) to store mask names

### Frontend Changes

#### battle-area.component.html
Updated all mask displays to show names when available:
- Desktop view: 3 team columns (Ally, Neutral, Enemy)
- Mobile view: 3 team sections (Ally, Neutral, Enemy)
- Team management lists at bottom
- Add Mask modal
- **Format:** Shows `mask.name` if available, otherwise falls back to `'Mask: ' + mask.maskID` or `'Mask ' + mask.maskID`

## Battle Strategy Notes

### Fighting Mirror King

**Phase 1:**
- Focus on killing summons first
- King's Decree deals massive single-target damage
- Commanding Presence buffs all summons every turn
- King cannot die while summons are alive

**Phase 2:**
- Triggered when all summons die and King reaches 0 HP
- All King's stats double
- All summons return with 2× stats
- Cataclysmic Reflection hits entire team with stun and burn
- Royal Restoration keeps summons healthy and tanky
- Must kill summons again to make King vulnerable

### Summon Priority
1. **Prismatic Shadow** - High damage, healing drain
2. **Fractured Echo** - DoT stacks on entire team
3. **Shattered Reflection** - Multi-hit bleeds
4. **Glass Phantom** - High bleed damage, becomes untargetable
5. **Crystal Guardian** - Tank, buffs team defense
6. **Refracted Soul** - Health redistribution, magic resist shred

## Required Assets
Place these images in `/Backend/assets/images/`:
- MirrorKing.jpg
- MirrorKingSummon1.jpg
- MirrorKingSummon2.jpg
- MirrorKingSummon3.jpg
- MirrorKingSummon4.jpg
- MirrorKingSummon5.jpg
- MirrorKingSummon6.jpg

## Database Migration
The MaskList model now includes a `name` field. Run the database sync to update the schema:
```bash
# The server will auto-sync on startup, or manually:
node Backend/sync.js
```

## Testing Checklist
- [ ] Mirror King appears in mask selection with proper name
- [ ] Can add Mirror King to battle
- [ ] Phase 1 skills work correctly
- [ ] King heals to full while summons alive
- [ ] King cannot die while summons alive
- [ ] Phase 2 triggers when all summons dead
- [ ] Phase 2 resummons all summons with 2× stats
- [ ] Phase 2 skills work correctly
- [ ] All summon skills function as designed
- [ ] Names display correctly in battle UI
- [ ] Battle messages show proper names
