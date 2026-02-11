import { UNITS } from '../constants/unitTypes.js';
import { TERRAIN } from '../constants/terrainTypes.js';

let nextUnitId = 1;

export function createUnit(typeId, owner, q, r) {
  const template = UNITS[typeId];
  if (!template) return null;

  return {
    id: nextUnitId++,
    type: typeId,
    owner,
    q,
    r,
    hp: template.hp,
    maxHp: template.hp,
    attack: template.attack,
    defense: template.defense,
    movement: template.movement,
    movementLeft: template.movement,
    upkeep: template.upkeep,
    experience: 0,
    veteranLevel: 0,
    icon: template.icon,
    name: template.name,
    category: template.category,
  };
}

export function resolveCombat(attacker, defender, attackerTile, defenderTile) {
  const atkUnit = UNITS[attacker.type];
  const defUnit = UNITS[defender.type];
  if (!atkUnit || !defUnit) return { winner: null };

  // Base stats with experience bonus
  const atkBonus = 1 + attacker.experience * 0.02;
  const defBonus = 1 + defender.experience * 0.02;

  let attackPower = attacker.attack * atkBonus;
  let defensePower = defender.defense * defBonus;

  // Terrain defense bonus
  if (defenderTile) {
    defensePower += defenderTile.terrain.defense || 0;

    // Fort bonus
    const hasFort = defenderTile.buildings?.some(b => b.type === 'fort');
    if (hasFort) defensePower += 5;
  }

  // Health ratio affects combat power
  const atkHealthRatio = attacker.hp / attacker.maxHp;
  const defHealthRatio = defender.hp / defender.maxHp;
  attackPower *= atkHealthRatio;
  defensePower *= defHealthRatio;

  // Randomness factor (0.8 - 1.2)
  const atkRoll = 0.8 + Math.random() * 0.4;
  const defRoll = 0.8 + Math.random() * 0.4;

  const finalAtk = attackPower * atkRoll;
  const finalDef = defensePower * defRoll;

  // Calculate damage
  const atkDamage = Math.max(1, Math.floor(finalAtk * 5));
  const defDamage = Math.max(1, Math.floor(finalDef * 3)); // defender deals less damage

  attacker.hp = Math.max(0, attacker.hp - defDamage);
  defender.hp = Math.max(0, defender.hp - atkDamage);

  // Gain experience
  attacker.experience += 2;
  defender.experience += 1;

  // Check veteran level ups
  if (attacker.experience >= 10 * (attacker.veteranLevel + 1)) {
    attacker.veteranLevel++;
    attacker.attack += 1;
    attacker.defense += 1;
    attacker.maxHp += 10;
  }
  if (defender.experience >= 10 * (defender.veteranLevel + 1)) {
    defender.veteranLevel++;
    defender.attack += 1;
    defender.defense += 1;
    defender.maxHp += 10;
  }

  const result = {
    attackerDamage: defDamage,
    defenderDamage: atkDamage,
    attackerSurvived: attacker.hp > 0,
    defenderSurvived: defender.hp > 0,
    attackerHpLeft: attacker.hp,
    defenderHpLeft: defender.hp,
  };

  if (attacker.hp <= 0 && defender.hp <= 0) {
    result.winner = 'draw';
  } else if (attacker.hp <= 0) {
    result.winner = 'defender';
  } else if (defender.hp <= 0) {
    result.winner = 'attacker';
  } else {
    result.winner = attacker.hp > defender.hp ? 'attacker_advantage' : 'defender_advantage';
  }

  return result;
}

export function canMoveUnit(unit, fromTile, toTile, tiles) {
  if (!toTile) return false;
  if (unit.movementLeft <= 0) return false;

  const dist = hexDistance(unit.q, unit.r, toTile.q, toTile.r);
  if (dist !== 1) return false;

  // Naval units can only move on water
  if (unit.category === 'naval') {
    return toTile.terrain.naval || toTile.terrain.id === 'coast';
  }

  // Land units can't move on deep water
  if (toTile.terrain.id === 'deep_ocean' || toTile.terrain.id === 'ocean') return false;

  // Check movement cost
  let moveCost = toTile.terrain.moveCost;
  // Road/railroad bonus
  if (toTile.buildings?.some(b => b.type === 'railroad')) moveCost = Math.max(0.5, moveCost - 1);
  else if (toTile.buildings?.some(b => b.type === 'road')) moveCost = Math.max(0.5, moveCost - 0.5);

  return unit.movementLeft >= moveCost;
}

export function moveUnit(unit, toTile) {
  let moveCost = toTile.terrain.moveCost;
  if (toTile.buildings?.some(b => b.type === 'railroad')) moveCost = Math.max(0.5, moveCost - 1);
  else if (toTile.buildings?.some(b => b.type === 'road')) moveCost = Math.max(0.5, moveCost - 0.5);

  unit.q = toTile.q;
  unit.r = toTile.r;
  unit.movementLeft = Math.max(0, unit.movementLeft - moveCost);
}

export function resetMovement(units) {
  for (const unit of units) {
    const template = UNITS[unit.type];
    unit.movementLeft = template ? template.movement : unit.movement;
    // Heal a bit each turn
    if (unit.hp < unit.maxHp) {
      unit.hp = Math.min(unit.maxHp, unit.hp + Math.floor(unit.maxHp * 0.1));
    }
  }
}

function hexDistance(q1, r1, q2, r2) {
  return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 + r2) + Math.abs(r1 - r2)) / 2;
}

export function getUnitsAt(tiles, q, r) {
  const key = `${q},${r}`;
  const tile = tiles[key];
  return tile ? tile.units : [];
}

export function calculateArmyStrength(units) {
  return units.reduce((sum, u) => {
    const healthRatio = u.hp / u.maxHp;
    return sum + (u.attack + u.defense) * healthRatio * (1 + u.veteranLevel * 0.15);
  }, 0);
}
