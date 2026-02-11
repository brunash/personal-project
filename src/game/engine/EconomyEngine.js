import { RESOURCES } from '../constants/resourceTypes.js';
import { BUILDINGS } from '../constants/buildingTypes.js';

export function createEconomyState() {
  const resources = {};
  for (const key of Object.keys(RESOURCES)) {
    resources[key] = 0;
  }
  return {
    resources,
    gold: 100,
    income: 0,
    expenses: 0,
    tradeDeals: [],
    productionQueue: [],
    workerCount: 5,
    maxWorkers: 10,
    taxRate: 0.2,
    stability: 70,
    population: 1000,
    populationGrowth: 0.02,
  };
}

export function processEconomy(nation, allTiles, turn) {
  const economy = nation.economy;
  const ownedTiles = Object.values(allTiles).filter(t => t.owner === nation.id);

  // Reset per-turn calculations
  let totalIncome = 0;
  let totalExpenses = 0;
  const produced = {};
  const consumed = {};

  // 1. Harvest resources from buildings
  for (const tile of ownedTiles) {
    for (const building of tile.buildings) {
      const bType = BUILDINGS[building.type];
      if (!bType || building.constructionLeft > 0) continue;

      // Production
      if (bType.produces) {
        for (const [res, amount] of Object.entries(bType.produces)) {
          const bonus = tile.terrain.id === 'river' ? 1.2 : 1.0;
          const railBonus = tile.buildings.some(b => b.type === 'railroad') ? 1.5 : 1.0;
          const totalAmount = Math.floor(amount * bonus * railBonus);
          economy.resources[res] = (economy.resources[res] || 0) + totalAmount;
          produced[res] = (produced[res] || 0) + totalAmount;
        }
      }

      // Consumption for processing buildings
      if (bType.consumes) {
        let canProduce = true;
        for (const [res, amount] of Object.entries(bType.consumes)) {
          if ((economy.resources[res] || 0) < amount) {
            canProduce = false;
            break;
          }
        }
        if (canProduce) {
          for (const [res, amount] of Object.entries(bType.consumes)) {
            economy.resources[res] -= amount;
            consumed[res] = (consumed[res] || 0) + amount;
          }
        }
      }

      // Gold income from markets etc.
      if (bType.goldPerTurn) {
        totalIncome += bType.goldPerTurn;
      }
    }

    // Tile resource bonus (unimproved natural resource)
    if (tile.resource && !tile.buildings.some(b => BUILDINGS[b.type]?.produces?.[tile.resource])) {
      economy.resources[tile.resource] = (economy.resources[tile.resource] || 0) + 1;
      produced[tile.resource] = (produced[tile.resource] || 0) + 1;
    }
  }

  // 2. Tax income based on population
  const taxIncome = Math.floor(economy.population * economy.taxRate * 0.01);
  totalIncome += taxIncome;

  // 3. Trade deals income
  for (const deal of economy.tradeDeals) {
    if (deal.active) {
      totalIncome += deal.goldPerTurn || 0;
      if (deal.sellingResource) {
        const amount = deal.amount || 1;
        if ((economy.resources[deal.sellingResource] || 0) >= amount) {
          economy.resources[deal.sellingResource] -= amount;
          totalIncome += (RESOURCES[deal.sellingResource]?.baseValue || 5) * amount;
        }
      }
    }
  }

  // 4. Military upkeep
  const units = Object.values(allTiles)
    .flatMap(t => t.units)
    .filter(u => u.owner === nation.id);
  for (const unit of units) {
    totalExpenses += unit.upkeep || 2;
  }

  // 5. Building maintenance
  totalExpenses += ownedTiles.reduce((sum, t) => sum + t.buildings.length, 0);

  // 6. Population growth
  const foodAvailable = (economy.resources.grain || 0) + (economy.resources.fish || 0) + (economy.resources.cattle || 0);
  const foodNeeded = Math.ceil(economy.population / 500);
  const foodSurplus = foodAvailable - foodNeeded;

  if (foodSurplus >= 0) {
    economy.population = Math.floor(economy.population * (1 + economy.populationGrowth));
    economy.maxWorkers = Math.floor(economy.population / 200) + 5;
    // Consume food
    const consumed = foodNeeded;
    let remaining = consumed;
    for (const food of ['grain', 'fish', 'cattle']) {
      const available = economy.resources[food] || 0;
      const take = Math.min(available, remaining);
      economy.resources[food] -= take;
      remaining -= take;
      if (remaining <= 0) break;
    }
  } else {
    // Famine!
    economy.population = Math.floor(economy.population * 0.97);
    economy.stability = Math.max(0, economy.stability - 3);
  }

  // 7. Stability effects from tax rate
  if (economy.taxRate > 0.3) {
    economy.stability = Math.max(0, economy.stability - 1);
  }
  if (economy.taxRate < 0.15) {
    economy.stability = Math.min(100, economy.stability + 1);
  }

  // Apply gold
  economy.income = totalIncome;
  economy.expenses = totalExpenses;
  economy.gold += totalIncome - totalExpenses;

  return {
    produced,
    consumed,
    income: totalIncome,
    expenses: totalExpenses,
    foodSurplus,
    netGold: totalIncome - totalExpenses,
  };
}

export function canAfford(economy, cost) {
  if (!cost) return true;
  for (const [resource, amount] of Object.entries(cost)) {
    if (resource === 'gold') {
      if (economy.gold < amount) return false;
    } else {
      if ((economy.resources[resource] || 0) < amount) return false;
    }
  }
  return true;
}

export function payCost(economy, cost) {
  if (!cost) return;
  for (const [resource, amount] of Object.entries(cost)) {
    if (resource === 'gold') {
      economy.gold -= amount;
    } else {
      economy.resources[resource] -= amount;
    }
  }
}

export function calculateTradeValue(resource, amount, buyerRelation) {
  const res = RESOURCES[resource];
  if (!res) return 0;
  const relationModifier = 1 + (buyerRelation / 200);
  return Math.floor(res.baseValue * amount * relationModifier);
}
