import { generateMap, findStartingPositions, getHexNeighbors } from './MapGenerator.js';
import { createEconomyState, processEconomy, canAfford, payCost } from './EconomyEngine.js';
import { createUnit, resolveCombat, resetMovement, moveUnit, canMoveUnit } from './MilitaryEngine.js';
import { createDiplomacyState, processDiplomacyTurn, modifyRelation, declareWar, makePeace, proposeTreaty } from './DiplomacyEngine.js';
import { processAITurn } from './AIEngine.js';
import { NATION_TEMPLATES } from '../constants/nationProfiles.js';
import { BUILDINGS } from '../constants/buildingTypes.js';
import { UNITS } from '../constants/unitTypes.js';
import { TECHNOLOGIES, getAvailableTechs } from '../constants/techTree.js';
import { RANDOM_EVENTS } from '../constants/events.js';

export function createNewGame(settings = {}) {
  const {
    mapWidth = 50,
    mapHeight = 40,
    numAI = 7,
    playerNation = 0,
    seed = Date.now(),
    difficulty = 'normal',
  } = settings;

  // Generate map
  const mapData = generateMap(mapWidth, mapHeight, seed);

  // Select nations
  const shuffled = [...NATION_TEMPLATES].sort(() => Math.random() - 0.5);
  const selectedNations = shuffled.slice(0, numAI + 1);

  // Find starting positions
  const startPositions = findStartingPositions(mapData, numAI + 1);

  // Create nations
  const nations = selectedNations.map((template, i) => {
    const isPlayer = i === playerNation;
    const startPos = startPositions[i];

    const nationIds = selectedNations.map(t => t.id);
    const otherNationIds = nationIds.filter(id => id !== template.id);

    const nation = {
      id: template.id,
      name: template.name,
      color: template.color,
      secondaryColor: template.secondaryColor,
      flag: template.flag,
      template,
      isPlayer,
      economy: createEconomyState(),
      diplomacy: createDiplomacyState(otherNationIds),
      researchedTechs: [],
      currentResearch: null,
      researchProgress: 0,
      capitalQ: startPos?.q || 0,
      capitalR: startPos?.r || 0,
      alive: true,
      score: 0,
    };

    // Difficulty adjustments for AI
    if (!isPlayer && difficulty === 'hard') {
      nation.economy.gold *= 1.5;
      nation.economy.workerCount += 3;
    }

    return nation;
  });

  // Set up starting territories and units
  for (const nation of nations) {
    const capitalKey = `${nation.capitalQ},${nation.capitalR}`;
    const capitalTile = mapData.tiles[capitalKey];
    if (!capitalTile) continue;

    // Claim capital and surrounding tiles
    capitalTile.owner = nation.id;
    capitalTile.buildings.push({ type: 'barracks', constructionLeft: 0 });
    capitalTile.buildings.push({ type: 'market', constructionLeft: 0 });

    const neighbors = getHexNeighbors(nation.capitalQ, nation.capitalR);
    for (const n of neighbors) {
      const key = `${n.q},${n.r}`;
      const tile = mapData.tiles[key];
      if (tile && tile.terrain.buildable && !tile.owner) {
        tile.owner = nation.id;
      }
    }

    // Starting units
    const startingUnits = [
      createUnit('infantry', nation.id, nation.capitalQ, nation.capitalR),
      createUnit('infantry', nation.id, nation.capitalQ, nation.capitalR),
      createUnit('engineer', nation.id, nation.capitalQ, nation.capitalR),
    ];

    capitalTile.units.push(...startingUnits);

    // Reveal map around capital for player
    if (nation.isPlayer) {
      revealArea(mapData.tiles, nation.capitalQ, nation.capitalR, 4, nation.id);
    }
  }

  const gameState = {
    map: mapData,
    nations,
    turn: 1,
    phase: 'player', // 'player', 'ai', 'events'
    selectedTile: null,
    selectedUnit: null,
    notifications: [],
    activeEvents: [],
    gameLog: [{ turn: 1, message: 'A new era begins. Build your empire!' }],
    settings: { mapWidth, mapHeight, numAI, difficulty },
    victoryConditions: {
      domination: 0.6,
      economicTarget: 5000,
      diplomaticVotes: Math.ceil((numAI + 1) * 0.6),
    },
    gameOver: false,
    winner: null,
  };

  return gameState;
}

export function endTurn(gameState) {
  const { map, nations, turn } = gameState;

  // Process construction progress
  for (const tile of Object.values(map.tiles)) {
    for (const building of tile.buildings) {
      if (building.constructionLeft > 0) {
        building.constructionLeft--;
      }
    }
  }

  // Process AI turns
  const aiActions = [];
  for (const nation of nations) {
    if (nation.isPlayer || !nation.alive) continue;

    // Reset AI unit movement
    const aiUnits = Object.values(map.tiles)
      .flatMap(t => t.units)
      .filter(u => u.owner === nation.id);
    resetMovement(aiUnits);

    const actions = processAITurn(nation, gameState);
    aiActions.push(...actions);
  }

  // Process economy for all nations
  const economyReports = {};
  for (const nation of nations) {
    if (!nation.alive) continue;
    economyReports[nation.id] = processEconomy(nation, map.tiles, turn);
  }

  // Process research
  for (const nation of nations) {
    if (!nation.alive || !nation.currentResearch) continue;

    const tech = TECHNOLOGIES[nation.currentResearch];
    if (!tech) continue;

    const researchRate = 3 + (nation.researchedTechs.length * 0.5);
    nation.researchProgress += researchRate;

    if (nation.researchProgress >= tech.cost) {
      nation.researchedTechs.push(nation.currentResearch);
      const msg = `${nation.name} has discovered ${tech.name}!`;
      gameState.gameLog.push({ turn, message: msg });
      if (nation.isPlayer) {
        gameState.notifications.push({ type: 'research', message: msg, tech: tech.id });
      }
      nation.currentResearch = null;
      nation.researchProgress = 0;
    }
  }

  // Process diplomacy
  processDiplomacyTurn(nations, turn);

  // Random events
  const events = processRandomEvents(gameState);

  // Reset player unit movement
  const playerUnits = Object.values(map.tiles)
    .flatMap(t => t.units)
    .filter(u => {
      const nation = nations.find(n => n.id === u.owner);
      return nation?.isPlayer;
    });
  resetMovement(playerUnits);

  // Calculate scores
  for (const nation of nations) {
    if (!nation.alive) continue;
    const ownedTiles = Object.values(map.tiles).filter(t => t.owner === nation.id);
    nation.score = ownedTiles.length * 10 + nation.economy.gold + nation.economy.population * 0.01;
  }

  // Check victory conditions
  checkVictoryConditions(gameState);

  gameState.turn++;

  return {
    aiActions,
    economyReports,
    events,
  };
}

function processRandomEvents(gameState) {
  const { nations, map, turn } = gameState;
  const triggered = [];

  // Decay active events
  gameState.activeEvents = gameState.activeEvents.filter(e => {
    e.turnsLeft--;
    return e.turnsLeft > 0;
  });

  // Check for new events
  for (const event of RANDOM_EVENTS) {
    if (Math.random() > event.probability) continue;

    // Pick a random nation to affect
    const aliveNations = nations.filter(n => n.alive);
    const target = aliveNations[Math.floor(Math.random() * aliveNations.length)];
    if (!target) continue;

    const ownedTiles = Object.values(map.tiles).filter(t => t.owner === target.id);
    if (ownedTiles.length === 0) continue;

    // Check conditions
    if (event.conditions.stabilityBelow && target.economy.stability >= event.conditions.stabilityBelow) continue;
    if (event.conditions.stabilityAbove && target.economy.stability <= event.conditions.stabilityAbove) continue;
    if (event.conditions.hasBuilding && !ownedTiles.some(t => t.buildings.some(b => b.type === event.conditions.hasBuilding))) continue;
    if (event.conditions.hasTerrain && !ownedTiles.some(t => event.conditions.hasTerrain.includes(t.terrain.id))) continue;

    // Apply event
    const territory = ownedTiles[Math.floor(Math.random() * ownedTiles.length)];
    const message = event.description
      .replace('{territory}', `(${territory.q},${territory.r})`)
      .replace('{randomNation}', aliveNations[Math.floor(Math.random() * aliveNations.length)]?.name || 'a foreign power');

    if (event.effects.stability) target.economy.stability = Math.max(0, Math.min(100, target.economy.stability + event.effects.stability));
    if (event.effects.goldIncome) target.economy.gold += event.effects.goldIncome;
    if (event.effects.population) target.economy.population = Math.floor(target.economy.population * event.effects.population);
    if (event.effects.researchBonus && target.currentResearch) target.researchProgress += event.effects.researchBonus;

    const triggeredEvent = {
      ...event,
      targetNation: target.id,
      targetTile: territory.key,
      message,
      turnsLeft: event.duration,
    };

    triggered.push(triggeredEvent);
    gameState.activeEvents.push(triggeredEvent);
    gameState.gameLog.push({ turn, message: `[${target.name}] ${message}` });

    if (target.isPlayer) {
      gameState.notifications.push({ type: 'event', message, event: event.id, icon: event.icon });
    }
  }

  return triggered;
}

function checkVictoryConditions(gameState) {
  const { nations, map, victoryConditions } = gameState;
  const totalLandTiles = Object.values(map.tiles).filter(t => t.terrain.buildable).length;

  for (const nation of nations) {
    if (!nation.alive) continue;

    const ownedTiles = Object.values(map.tiles).filter(t => t.owner === nation.id).length;

    // Domination
    if (ownedTiles / totalLandTiles >= victoryConditions.domination) {
      gameState.gameOver = true;
      gameState.winner = nation.id;
      gameState.victoryType = 'domination';
      return;
    }

    // Economic
    if (nation.economy.gold >= victoryConditions.economicTarget) {
      gameState.gameOver = true;
      gameState.winner = nation.id;
      gameState.victoryType = 'economic';
      return;
    }
  }
}

export function revealArea(tiles, centerQ, centerR, radius, nationId) {
  for (const tile of Object.values(tiles)) {
    const dist = hexDist(centerQ, centerR, tile.q, tile.r);
    if (dist <= radius) {
      if (!tile.explored) tile.explored = {};
      tile.explored[nationId] = true;
      tile.fog = false;
    }
  }
}

function hexDist(q1, r1, q2, r2) {
  return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
}

// Player action handlers
export function playerBuild(gameState, tileKey, buildingId) {
  const player = gameState.nations.find(n => n.isPlayer);
  if (!player) return { success: false, message: 'No player nation' };

  const tile = gameState.map.tiles[tileKey];
  if (!tile) return { success: false, message: 'Invalid tile' };
  if (tile.owner !== player.id) return { success: false, message: 'Not your territory' };

  const building = BUILDINGS[buildingId];
  if (!building) return { success: false, message: 'Invalid building' };
  if (!building.validTerrain.includes(tile.terrain.id)) return { success: false, message: 'Cannot build here' };
  if (tile.buildings.some(b => b.type === buildingId)) return { success: false, message: 'Already built' };
  if (!canAfford(player.economy, building.cost)) return { success: false, message: 'Cannot afford' };
  if (building.requiresTech && !player.researchedTechs.includes(building.requiresTech)) {
    return { success: false, message: `Requires ${TECHNOLOGIES[building.requiresTech]?.name}` };
  }

  payCost(player.economy, building.cost);
  tile.buildings.push({ type: buildingId, constructionLeft: building.buildTime });

  gameState.gameLog.push({
    turn: gameState.turn,
    message: `Started building ${building.name} at (${tile.q},${tile.r})`,
  });

  return { success: true, message: `Building ${building.name}` };
}

export function playerRecruit(gameState, tileKey, unitTypeId) {
  const player = gameState.nations.find(n => n.isPlayer);
  if (!player) return { success: false, message: 'No player nation' };

  const tile = gameState.map.tiles[tileKey];
  if (!tile || tile.owner !== player.id) return { success: false, message: 'Invalid tile' };

  const unitType = UNITS[unitTypeId];
  if (!unitType) return { success: false, message: 'Invalid unit type' };

  // Check for barracks/port
  if (unitType.category === 'land' && !tile.buildings.some(b => b.type === 'barracks' && b.constructionLeft === 0)) {
    return { success: false, message: 'Needs a barracks' };
  }
  if (unitType.category === 'naval' && !tile.buildings.some(b => b.type === 'port' && b.constructionLeft === 0)) {
    return { success: false, message: 'Needs a port' };
  }

  if (!canAfford(player.economy, unitType.cost)) return { success: false, message: 'Cannot afford' };
  if (unitType.requiresTech && !player.researchedTechs.includes(unitType.requiresTech)) {
    return { success: false, message: `Requires ${TECHNOLOGIES[unitType.requiresTech]?.name}` };
  }

  payCost(player.economy, unitType.cost);
  const unit = createUnit(unitTypeId, player.id, tile.q, tile.r);
  tile.units.push(unit);

  gameState.gameLog.push({
    turn: gameState.turn,
    message: `Recruited ${unitType.name} at (${tile.q},${tile.r})`,
  });

  return { success: true, message: `Recruited ${unitType.name}`, unit };
}

export function playerMoveUnit(gameState, unitId, targetQ, targetR) {
  const player = gameState.nations.find(n => n.isPlayer);
  if (!player) return { success: false };

  // Find the unit
  let unit = null;
  let fromTile = null;
  for (const tile of Object.values(gameState.map.tiles)) {
    const found = tile.units.find(u => u.id === unitId && u.owner === player.id);
    if (found) {
      unit = found;
      fromTile = tile;
      break;
    }
  }

  if (!unit) return { success: false, message: 'Unit not found' };

  const targetKey = `${targetQ},${targetR}`;
  const toTile = gameState.map.tiles[targetKey];
  if (!toTile) return { success: false, message: 'Invalid target' };

  if (!canMoveUnit(unit, fromTile, toTile, gameState.map.tiles)) {
    return { success: false, message: 'Cannot move there' };
  }

  // Check for enemies
  const enemies = toTile.units.filter(u => u.owner !== player.id);
  if (enemies.length > 0) {
    const rel = player.diplomacy[enemies[0].owner];
    if (rel && rel.status === 'war') {
      // Combat!
      const result = resolveCombat(unit, enemies[0], fromTile, toTile);
      gameState.gameLog.push({
        turn: gameState.turn,
        message: `Battle! Your ${unit.name} vs enemy ${enemies[0].name} - ${result.winner}`,
      });

      if (!result.attackerSurvived) {
        fromTile.units = fromTile.units.filter(u => u.id !== unit.id);
      }
      if (!result.defenderSurvived) {
        toTile.units = toTile.units.filter(u => u.id !== enemies[0].id);
        if (result.attackerSurvived) {
          fromTile.units = fromTile.units.filter(u => u.id !== unit.id);
          toTile.units.push(unit);
          moveUnit(unit, toTile);
          toTile.owner = player.id;
        }
      }

      return { success: true, combat: result };
    }
    return { success: false, message: 'Cannot enter tile with foreign units' };
  }

  // Move
  fromTile.units = fromTile.units.filter(u => u.id !== unit.id);
  toTile.units.push(unit);
  moveUnit(unit, toTile);

  // Claim unowned buildable tiles
  if (!toTile.owner && toTile.terrain.buildable) {
    toTile.owner = player.id;
  }

  // Reveal fog
  revealArea(gameState.map.tiles, targetQ, targetR, 2, player.id);

  return { success: true };
}

export function playerDeclareWar(gameState, targetNationId) {
  const player = gameState.nations.find(n => n.isPlayer);
  const target = gameState.nations.find(n => n.id === targetNationId);
  if (!player || !target) return { success: false };

  declareWar(player.diplomacy, target.diplomacy, player.id, target.id, gameState.turn);
  gameState.gameLog.push({
    turn: gameState.turn,
    message: `${player.name} declares war on ${target.name}!`,
  });

  // Other nations react
  for (const nation of gameState.nations) {
    if (nation.id === player.id || nation.id === target.id) continue;
    // Allies of target get angry
    const relWithTarget = nation.diplomacy[target.id];
    if (relWithTarget && relWithTarget.value > 30) {
      modifyRelation(nation.diplomacy, player.id, -20, 'Attacked our friend');
    }
  }

  return { success: true, message: `War declared on ${target.name}!` };
}

export function playerProposeTreaty(gameState, targetNationId, treatyType) {
  const player = gameState.nations.find(n => n.isPlayer);
  const target = gameState.nations.find(n => n.id === targetNationId);
  if (!player || !target) return { success: false };

  return proposeTreaty(player, target, treatyType, gameState.turn);
}

export function playerSetResearch(gameState, techId) {
  const player = gameState.nations.find(n => n.isPlayer);
  if (!player) return { success: false };

  const tech = TECHNOLOGIES[techId];
  if (!tech) return { success: false, message: 'Invalid technology' };

  const available = getAvailableTechs(player.researchedTechs);
  if (!available.find(t => t.id === techId)) return { success: false, message: 'Prerequisites not met' };

  player.currentResearch = techId;
  player.researchProgress = 0;

  return { success: true, message: `Researching ${tech.name}` };
}
