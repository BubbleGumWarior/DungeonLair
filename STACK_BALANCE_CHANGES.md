# Stack System Balance Changes

## Overview
Rebalanced the poison, burn, bleed, and stun stack systems to address balance issues where bleed was overpowered, burn and poison felt negligible, and stun was appropriately balanced.

## Changes Made

### 🔥 Burn Stacks (BUFFED)
**Old System:**
- 2.5% max health per turn
- 1 stack decay per turn
- Special: 20 * stacks damage if ≥50 stacks

**New System:**
- **1.5% base + 0.5% per stack** damage (scales better)
- 1 stack decay per turn (unchanged)
- Special: **10% max health burst** if ≥20 stacks (lowered threshold, more impactful)
- **Result:** Burns now feel meaningful and dangerous, scaling with stack count

### ☠️ Poison Stacks (BUFFED)
**Old System:**
- 0.05% max health per stack
- 25% stack growth per turn
- Execute if health < stacks/10

**New System:**
- **1% max health per stack** (20x damage increase!)
- **10% stack growth** per turn (slower spread)
- Execute if **health ≤15% AND ≥10 stacks** (more reasonable)
- **Result:** Poison is now immediately threatening but grows slower

### 🩸 Bleed Stacks (NERFED)
**Old System:**
- 0.5% max health per stack
- Execute if stacks ≥ (health% * 2)
- No decay

**New System:**
- **0.2% max health per stack** (60% damage reduction)
- Execute if stacks ≥ **(health% * 5) AND health ≤10%** (much harder to execute)
- **Decay:** Stacks >10 reduce by 1 per turn
- **Result:** Bleed is still dangerous but no longer instantly lethal

### 😵 Stun Stacks (UNCHANGED)
- Remains balanced as originally designed
- 1 stack decay per turn
- Prevents actions while active

## Damage Comparison Examples

### With 10 Stacks on 1000 HP Target:
| Stack Type | Old Damage | New Damage | Change |
|------------|------------|------------|---------|
| Burn (10 stacks) | 25 HP | 65 HP | +160% |
| Poison (10 stacks) | 0.5 HP | 100 HP | +19,900% |
| Bleed (10 stacks) | 50 HP | 20 HP | -60% |

### Execution Thresholds:
| Stack Type | Old Condition | New Condition |
|------------|---------------|---------------|
| Burn | ≥50 stacks | ≥20 stacks (burst damage) |
| Poison | health < stacks/10 | health ≤15% AND ≥10 stacks |
| Bleed | stacks ≥ (health% * 2) | stacks ≥ (health% * 5) AND health ≤10% |

## Quality of Life Improvements
- Added battle messages for severe stack effects
- Added console logging for stack damage tracking
- Better feedback when masks succumb to stacks

## Balance Philosophy
- **Burn:** Quick, escalating threat that demands immediate attention
- **Poison:** High immediate impact but controlled spread
- **Bleed:** Sustained pressure without instant kills
- **Stun:** Tactical control tool (unchanged)

These changes ensure each stack type has a distinct role and feel while maintaining strategic depth.
