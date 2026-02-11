export const RELATION_STATUS = {
  WAR: 'war',
  HOSTILE: 'hostile',
  COLD: 'cold',
  NEUTRAL: 'neutral',
  FRIENDLY: 'friendly',
  ALLIED: 'allied',
};

export const TREATY_TYPES = {
  TRADE_AGREEMENT: 'trade_agreement',
  NON_AGGRESSION: 'non_aggression',
  MILITARY_ACCESS: 'military_access',
  ALLIANCE: 'alliance',
  PEACE: 'peace',
};

export function createDiplomacyState(nationIds) {
  const relations = {};
  for (const id of nationIds) {
    relations[id] = {
      value: 0,
      status: RELATION_STATUS.NEUTRAL,
      treaties: [],
      tradeDeals: [],
      warHistory: [],
      lastAction: null,
      trustLevel: 50,
    };
  }
  return relations;
}

export function getRelationStatus(value) {
  if (value <= -75) return RELATION_STATUS.WAR;
  if (value <= -40) return RELATION_STATUS.HOSTILE;
  if (value <= -10) return RELATION_STATUS.COLD;
  if (value <= 30) return RELATION_STATUS.NEUTRAL;
  if (value <= 65) return RELATION_STATUS.FRIENDLY;
  return RELATION_STATUS.ALLIED;
}

export function modifyRelation(diplomacy, nationId, amount, reason) {
  if (!diplomacy[nationId]) return;
  diplomacy[nationId].value = Math.max(-100, Math.min(100, diplomacy[nationId].value + amount));
  diplomacy[nationId].status = getRelationStatus(diplomacy[nationId].value);
  diplomacy[nationId].lastAction = reason;
}

export function declareWar(diplomacyA, diplomacyB, nationAId, nationBId, turn) {
  if (diplomacyA[nationBId]) {
    diplomacyA[nationBId].value = -100;
    diplomacyA[nationBId].status = RELATION_STATUS.WAR;
    diplomacyA[nationBId].treaties = [];
    diplomacyA[nationBId].tradeDeals = [];
    diplomacyA[nationBId].warHistory.push({ startTurn: turn, endTurn: null });
  }
  if (diplomacyB[nationAId]) {
    diplomacyB[nationAId].value = -100;
    diplomacyB[nationAId].status = RELATION_STATUS.WAR;
    diplomacyB[nationAId].treaties = [];
    diplomacyB[nationAId].tradeDeals = [];
    diplomacyB[nationAId].warHistory.push({ startTurn: turn, endTurn: null });
  }
}

export function makePeace(diplomacyA, diplomacyB, nationAId, nationBId, turn) {
  if (diplomacyA[nationBId]) {
    diplomacyA[nationBId].value = -20;
    diplomacyA[nationBId].status = RELATION_STATUS.COLD;
    diplomacyA[nationBId].treaties.push({ type: TREATY_TYPES.PEACE, startTurn: turn });
    const war = diplomacyA[nationBId].warHistory.find(w => !w.endTurn);
    if (war) war.endTurn = turn;
  }
  if (diplomacyB[nationAId]) {
    diplomacyB[nationAId].value = -20;
    diplomacyB[nationAId].status = RELATION_STATUS.COLD;
    diplomacyB[nationAId].treaties.push({ type: TREATY_TYPES.PEACE, startTurn: turn });
    const war = diplomacyB[nationAId].warHistory.find(w => !w.endTurn);
    if (war) war.endTurn = turn;
  }
}

export function proposeTreaty(proposer, receiver, treatyType, turn) {
  // AI acceptance logic based on relations and treaty type
  const relation = proposer.diplomacy[receiver.id];
  if (!relation) return { accepted: false, reason: 'Unknown nation' };

  const relationValue = relation.value;
  let requiredRelation = 0;

  switch (treatyType) {
    case TREATY_TYPES.TRADE_AGREEMENT:
      requiredRelation = -10;
      break;
    case TREATY_TYPES.NON_AGGRESSION:
      requiredRelation = 10;
      break;
    case TREATY_TYPES.MILITARY_ACCESS:
      requiredRelation = 30;
      break;
    case TREATY_TYPES.ALLIANCE:
      requiredRelation = 60;
      break;
    default:
      requiredRelation = 0;
  }

  // Already have this treaty?
  if (relation.treaties.some(t => t.type === treatyType)) {
    return { accepted: false, reason: 'Treaty already exists' };
  }

  // At war?
  if (relation.status === RELATION_STATUS.WAR) {
    return { accepted: false, reason: 'Currently at war' };
  }

  const accepted = relationValue >= requiredRelation;
  if (accepted) {
    relation.treaties.push({ type: treatyType, startTurn: turn });
    // Also add to receiver
    if (receiver.diplomacy[proposer.id]) {
      receiver.diplomacy[proposer.id].treaties.push({ type: treatyType, startTurn: turn });
    }
    modifyRelation(proposer.diplomacy, receiver.id, 5, `Signed ${treatyType}`);
    modifyRelation(receiver.diplomacy, proposer.id, 5, `Signed ${treatyType}`);
  }

  return {
    accepted,
    reason: accepted ? 'Treaty signed!' : 'Relations are not warm enough',
  };
}

export function processDiplomacyTurn(nations, turn) {
  // Natural drift toward neutral
  for (const nation of nations) {
    for (const [otherId, rel] of Object.entries(nation.diplomacy)) {
      if (rel.status === RELATION_STATUS.WAR) continue;

      // Slow drift toward 0
      if (rel.value > 0) {
        rel.value = Math.max(0, rel.value - 0.5);
      } else if (rel.value < 0) {
        rel.value = Math.min(0, rel.value + 0.5);
      }

      // Treaty bonuses
      if (rel.treaties.some(t => t.type === TREATY_TYPES.TRADE_AGREEMENT)) {
        rel.value = Math.min(100, rel.value + 0.3);
      }
      if (rel.treaties.some(t => t.type === TREATY_TYPES.ALLIANCE)) {
        rel.value = Math.min(100, rel.value + 0.5);
      }

      rel.status = getRelationStatus(rel.value);
    }
  }
}

export function evaluateWarWillingness(nation, targetNation, militaryBalance) {
  const relation = nation.diplomacy[targetNation.id];
  if (!relation) return 0;

  let willingness = 0;

  // Base willingness from relations
  willingness += (50 - relation.value) * 0.3;

  // Military advantage
  willingness += (militaryBalance - 1) * 30;

  // Personality modifiers
  const aggression = nation.template?.traits?.aggression || 1.0;
  willingness *= aggression;

  // Treaties reduce willingness
  if (relation.treaties.some(t => t.type === TREATY_TYPES.NON_AGGRESSION)) willingness -= 30;
  if (relation.treaties.some(t => t.type === TREATY_TYPES.ALLIANCE)) willingness -= 60;

  // Recent peace reduces willingness
  const recentPeace = relation.warHistory.find(
    w => w.endTurn && w.endTurn > -20
  );
  if (recentPeace) willingness -= 20;

  return willingness;
}
