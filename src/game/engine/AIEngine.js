import { BUILDINGS, BUILDING_LIST } from '../constants/buildingTypes.js';
import { UNITS, LAND_UNITS } from '../constants/unitTypes.js';
import { getAvailableTechs } from '../constants/techTree.js';
import { canAfford, payCost } from './EconomyEngine.js';
import { createUnit, calculateArmyStrength, resolveCombat } from './MilitaryEngine.js';
import { declareWar, proposeTreaty, evaluateWarWillingness, TREATY_TYPES, RELATION_STATUS } from './DiplomacyEngine.js';
import { getHexNeighbors } from './MapGenerator.js';

export function processAITurn(nation, gameState) {
  const { tiles, nations, turn } = gameState;
  const personality = nation.template?.personality || 'balanced';
  const traits = nation.template?.traits || {};

  const ownedTiles = Object.values(tiles).filter(t => t.owner === nation.id);
  const myUnits = Object.values(tiles).flatMap(t => t.units.filter(u => u.owner === nation.id));
  const actions = [];

  // 1. Decide research
  const techAction = decideTechResearch(nation, personality);
  if (techAction) actions.push(techAction);

  // 2. Build infrastructure
  const buildActions = decideBuildActions(nation, ownedTiles, tiles, traits);
  actions.push(...buildActions);

  // 3. Recruit military
  const recruitActions = decideRecruitment(nation, ownedTiles, myUnits, tiles, traits);
  actions.push(...recruitActions);

  // 4. Move units
  const moveActions = decideMilitaryMoves(nation, myUnits, tiles, nations, traits);
  actions.push(...moveActions);

  // 5. Diplomacy
  const diploActions = decideDiplomacy(nation, nations, tiles, turn, traits);
  actions.push(...diploActions);

  // 6. Adjust economy
  const econActions = decideEconomy(nation, traits);
  actions.push(...econActions);

  return actions;
}

function decideTechResearch(nation, personality) {
  if (nation.currentResearch) return null;

  const available = getAvailableTechs(nation.researchedTechs || []);
  if (available.length === 0) return null;

  // Weight by personality
  const weighted = available.map(tech => {
    let weight = 1;
    switch (personality) {
      case 'militarist':
        if (tech.category === 'military') weight = 3;
        break;
      case 'merchant':
        if (tech.category === 'economy') weight = 3;
        if (tech.category === 'naval') weight = 2;
        break;
      case 'industrialist':
        if (tech.category === 'industry') weight = 3;
        break;
      case 'diplomat':
        if (tech.category === 'culture') weight = 3;
        if (tech.category === 'economy') weight = 2;
        break;
      case 'expansionist':
        if (tech.category === 'military') weight = 2;
        if (tech.category === 'industry') weight = 2;
        break;
      default:
        weight = 1;
    }
    // Prefer lower tier (earlier) techs
    weight += (5 - tech.tier) * 0.5;
    return { tech, weight };
  });

  weighted.sort((a, b) => b.weight - a.weight);
  const chosen = weighted[0].tech;

  nation.currentResearch = chosen.id;
  nation.researchProgress = 0;

  return { type: 'research', tech: chosen.id, nation: nation.id };
}

function decideBuildActions(nation, ownedTiles, tiles, traits) {
  const actions = [];
  const industrialBias = traits.industry || 1.0;

  // Prioritize buildings based on needs
  const needs = analyzeNeeds(nation, ownedTiles);

  for (const tile of ownedTiles) {
    if (tile.buildings.length >= 3) continue; // Max buildings per tile

    let bestBuilding = null;
    let bestScore = 0;

    for (const building of BUILDING_LIST) {
      if (!building.validTerrain?.includes(tile.terrain.id)) continue;
      if (tile.buildings.some(b => b.type === building.id)) continue;
      if (!canAfford(nation.economy, building.cost)) continue;
      if (building.requiresTech && !nation.researchedTechs?.includes(building.requiresTech)) continue;
      if (building.requiresResource && tile.resource !== building.requiresResource) continue;
      if (building.replacesBuilding && !tile.buildings.some(b => b.type === building.replacesBuilding)) continue;

      let score = 0;

      // Score based on needs
      if (building.produces) {
        for (const res of Object.keys(building.produces)) {
          score += (needs[res] || 1) * 2;
        }
      }
      if (building.id === 'barracks' && needs.military > 0) score += needs.military * 3;
      if (building.id === 'port' && needs.naval > 0) score += needs.naval * 3;
      if (building.id === 'market') score += 3;
      if (building.id === 'road' || building.id === 'railroad') score += 2;
      if (building.id === 'university') score += 4;
      if (building.id === 'fort' && needs.defense > 0) score += needs.defense * 2;

      score *= industrialBias;

      if (score > bestScore) {
        bestScore = score;
        bestBuilding = building;
      }
    }

    if (bestBuilding && bestScore > 2) {
      payCost(nation.economy, bestBuilding.cost);
      tile.buildings.push({
        type: bestBuilding.id,
        constructionLeft: bestBuilding.buildTime,
      });
      actions.push({ type: 'build', building: bestBuilding.id, tile: tile.key, nation: nation.id });
    }
  }

  return actions;
}

function analyzeNeeds(nation, ownedTiles) {
  const needs = {};
  const economy = nation.economy;

  // Food needs
  const foodTotal = (economy.resources.grain || 0) + (economy.resources.fish || 0) + (economy.resources.cattle || 0);
  if (foodTotal < economy.population / 300) needs.grain = 5;

  // Industrial needs
  if ((economy.resources.iron || 0) < 3) needs.iron = 3;
  if ((economy.resources.coal || 0) < 3) needs.coal = 3;
  if ((economy.resources.timber || 0) < 3) needs.timber = 3;

  // Military needs
  const hasBarracks = ownedTiles.some(t => t.buildings.some(b => b.type === 'barracks'));
  if (!hasBarracks) needs.military = 5;

  // Naval needs
  const hasPort = ownedTiles.some(t => t.buildings.some(b => b.type === 'port'));
  const coastTiles = ownedTiles.filter(t => {
    const neighbors = getHexNeighbors(t.q, t.r);
    return neighbors.some(n => {
      const nTile = Object.values(ownedTiles).find(ot => ot.q === n.q && ot.r === n.r);
      return nTile?.terrain?.naval;
    });
  });
  if (!hasPort && coastTiles.length > 0) needs.naval = 3;

  // Defense needs
  const borderTiles = ownedTiles.filter(t => {
    const neighbors = getHexNeighbors(t.q, t.r);
    return neighbors.some(n => {
      const key = `${n.q},${n.r}`;
      const nTile = Object.values(ownedTiles).find(ot => ot.key === key);
      return !nTile;
    });
  });
  if (borderTiles.some(t => !t.buildings.some(b => b.type === 'fort'))) needs.defense = 2;

  return needs;
}

function decideRecruitment(nation, ownedTiles, existingUnits, tiles, traits) {
  const actions = [];
  const militaryBias = traits.military || 1.0;

  const targetArmySize = Math.max(3, Math.floor(ownedTiles.length * 0.3 * militaryBias));
  const landUnits = existingUnits.filter(u => u.category === 'land');

  if (landUnits.length >= targetArmySize) return actions;

  // Find tiles with barracks
  const recruitTiles = ownedTiles.filter(t =>
    t.buildings.some(b => b.type === 'barracks' && b.constructionLeft === 0)
  );

  for (const tile of recruitTiles) {
    if (landUnits.length >= targetArmySize) break;

    // Choose unit type based on available resources and personality
    let unitType = 'militia';
    if (canAfford(nation.economy, UNITS.infantry?.cost) && nation.economy.gold > 100) {
      unitType = 'infantry';
    }
    if (canAfford(nation.economy, UNITS.cavalry?.cost) && militaryBias > 1.2) {
      unitType = 'cavalry';
    }

    const unit = UNITS[unitType];
    if (unit && canAfford(nation.economy, unit.cost)) {
      payCost(nation.economy, unit.cost);
      const newUnit = createUnit(unitType, nation.id, tile.q, tile.r);
      tile.units.push(newUnit);
      actions.push({ type: 'recruit', unit: unitType, tile: tile.key, nation: nation.id });
    }
  }

  return actions;
}

function decideMilitaryMoves(nation, units, tiles, nations, traits) {
  const actions = [];
  const aggressionBias = traits.aggression || 1.0;

  for (const unit of units) {
    if (unit.movementLeft <= 0) continue;

    const currentTile = tiles[`${unit.q},${unit.r}`];
    if (!currentTile) continue;

    const neighbors = getHexNeighbors(unit.q, unit.r);
    let bestTarget = null;
    let bestScore = -Infinity;

    for (const n of neighbors) {
      const key = `${n.q},${n.r}`;
      const nTile = tiles[key];
      if (!nTile) continue;

      // Can't move into water with land units
      if (unit.category === 'land' && (nTile.terrain.naval && nTile.terrain.id !== 'coast')) continue;

      let score = 0;

      // Enemy territory
      if (nTile.owner && nTile.owner !== nation.id) {
        const rel = nation.diplomacy[nTile.owner];
        if (rel && rel.status === RELATION_STATUS.WAR) {
          score += 20 * aggressionBias;
          // Enemy units there?
          const enemyUnits = nTile.units.filter(u => u.owner !== nation.id);
          if (enemyUnits.length > 0) {
            const enemyStrength = calculateArmyStrength(enemyUnits);
            const myStrength = unit.attack * (unit.hp / unit.maxHp);
            if (myStrength > enemyStrength * 0.8) {
              score += 15;
            } else {
              score -= 10; // Don't attack stronger enemies
            }
          } else {
            score += 10; // Undefended territory
          }
        }
      }

      // Unowned territory - expansion
      if (!nTile.owner && nTile.terrain.buildable) {
        score += 5 * (traits.expansion || 1.0);
      }

      // Defend own territory
      if (nTile.owner === nation.id) {
        const enemyNearby = getHexNeighbors(n.q, n.r).some(nn => {
          const nnTile = tiles[`${nn.q},${nn.r}`];
          return nnTile?.units?.some(u => u.owner !== nation.id);
        });
        if (enemyNearby) score += 8;
      }

      if (score > bestScore && score > 0) {
        bestScore = score;
        bestTarget = nTile;
      }
    }

    if (bestTarget) {
      // Check for combat
      const enemyUnits = bestTarget.units.filter(u => u.owner !== nation.id);
      if (enemyUnits.length > 0 && nation.diplomacy[enemyUnits[0].owner]?.status === RELATION_STATUS.WAR) {
        const combatResult = resolveCombat(unit, enemyUnits[0], currentTile, bestTarget);
        actions.push({
          type: 'combat',
          attacker: unit.id,
          defender: enemyUnits[0].id,
          result: combatResult,
          nation: nation.id,
        });

        if (!combatResult.attackerSurvived) {
          currentTile.units = currentTile.units.filter(u => u.id !== unit.id);
        }
        if (!combatResult.defenderSurvived) {
          bestTarget.units = bestTarget.units.filter(u => u.id !== enemyUnits[0].id);
          if (combatResult.attackerSurvived) {
            currentTile.units = currentTile.units.filter(u => u.id !== unit.id);
            bestTarget.units.push(unit);
            unit.q = bestTarget.q;
            unit.r = bestTarget.r;
            unit.movementLeft = 0;
            bestTarget.owner = nation.id;
          }
        }
      } else if (!bestTarget.owner || bestTarget.owner === nation.id) {
        // Peaceful move
        currentTile.units = currentTile.units.filter(u => u.id !== unit.id);
        bestTarget.units.push(unit);
        unit.q = bestTarget.q;
        unit.r = bestTarget.r;
        unit.movementLeft -= bestTarget.terrain.moveCost;

        if (!bestTarget.owner && bestTarget.terrain.buildable) {
          bestTarget.owner = nation.id;
          actions.push({ type: 'claim', tile: bestTarget.key, nation: nation.id });
        }

        actions.push({ type: 'move', unit: unit.id, to: bestTarget.key, nation: nation.id });
      }
    }
  }

  return actions;
}

function decideDiplomacy(nation, nations, tiles, turn, traits) {
  const actions = [];
  const diplomacyBias = traits.diplomacy || 1.0;
  const aggressionBias = traits.aggression || 1.0;

  for (const other of nations) {
    if (other.id === nation.id || other.isPlayer) continue;

    const rel = nation.diplomacy[other.id];
    if (!rel) continue;

    // Consider declaring war
    if (rel.status !== RELATION_STATUS.WAR && aggressionBias > 0.8) {
      const myStrength = calculateNationStrength(nation, tiles);
      const theirStrength = calculateNationStrength(other, tiles);
      const balance = myStrength / Math.max(1, theirStrength);

      const warWill = evaluateWarWillingness(nation, other, balance);
      if (warWill > 50 && Math.random() < 0.1 * aggressionBias) {
        declareWar(nation.diplomacy, other.diplomacy, nation.id, other.id, turn);
        actions.push({ type: 'declare_war', target: other.id, nation: nation.id });
      }
    }

    // Consider proposing treaties
    if (rel.status !== RELATION_STATUS.WAR && diplomacyBias > 0.8) {
      if (rel.value > -10 && !rel.treaties.some(t => t.type === TREATY_TYPES.TRADE_AGREEMENT)) {
        if (Math.random() < 0.15 * diplomacyBias) {
          const result = proposeTreaty(nation, other, TREATY_TYPES.TRADE_AGREEMENT, turn);
          if (result.accepted) {
            actions.push({ type: 'treaty', treaty: TREATY_TYPES.TRADE_AGREEMENT, target: other.id, nation: nation.id });
          }
        }
      }
    }
  }

  return actions;
}

function decideEconomy(nation, traits) {
  const actions = [];
  const economy = nation.economy;

  // Adjust tax rate based on stability and gold
  if (economy.stability < 40 && economy.taxRate > 0.1) {
    economy.taxRate = Math.max(0.05, economy.taxRate - 0.05);
    actions.push({ type: 'adjust_tax', rate: economy.taxRate, nation: nation.id });
  } else if (economy.gold < 50 && economy.stability > 60) {
    economy.taxRate = Math.min(0.4, economy.taxRate + 0.05);
    actions.push({ type: 'adjust_tax', rate: economy.taxRate, nation: nation.id });
  }

  return actions;
}

function calculateNationStrength(nation, tiles) {
  const ownedTiles = Object.values(tiles).filter(t => t.owner === nation.id);
  const units = ownedTiles.flatMap(t => t.units.filter(u => u.owner === nation.id));
  const armyStrength = calculateArmyStrength(units);
  const economicStrength = nation.economy.gold * 0.1 + ownedTiles.length * 2;
  return armyStrength + economicStrength;
}
