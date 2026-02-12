import React, { useState } from 'react';
import { BUILDINGS, BUILDING_LIST } from '../game/constants/buildingTypes.js';
import { UNITS, LAND_UNITS, NAVAL_UNITS } from '../game/constants/unitTypes.js';
import { RESOURCES } from '../game/constants/resourceTypes.js';
import { getAvailableTechs, TECHNOLOGIES } from '../game/constants/techTree.js';
import { canAfford } from '../game/engine/EconomyEngine.js';
import { TREATY_TYPES, RELATION_STATUS } from '../game/engine/DiplomacyEngine.js';

const TABS = {
  TILE: 'tile', ECONOMY: 'economy', MILITARY: 'military',
  DIPLOMACY: 'diplomacy', RESEARCH: 'research', LOG: 'log',
};

export default function SidePanel({
  gameState, selectedTile, selectedUnit,
  onBuild, onRecruit, onSelectUnit, onDeselectUnit,
  onDeclareWar, onProposeTreaty, onSetResearch,
}) {
  const [activeTab, setActiveTab] = useState(TABS.TILE);
  const player = gameState.nations.find(n => n.isPlayer);

  const tabs = [
    { id: TABS.TILE, icon: '\u{1F5FA}', label: 'Land' },
    { id: TABS.ECONOMY, icon: '\u{1F4B0}', label: 'Econ' },
    { id: TABS.MILITARY, icon: '\u{2694}', label: 'Army' },
    { id: TABS.DIPLOMACY, icon: '\u{1F91D}', label: 'Diplo' },
    { id: TABS.RESEARCH, icon: '\u{1F52C}', label: 'Tech' },
    { id: TABS.LOG, icon: '\u{1F4DC}', label: 'Log' },
  ];

  return (
    <div className="sidepanel">
      <div className="sidepanel-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`sidepanel-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            title={tab.label}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>
      <div className="sidepanel-content">
        {activeTab === TABS.TILE && (
          <TilePanel tile={selectedTile} player={player} selectedUnit={selectedUnit}
            gameState={gameState} onBuild={onBuild} onRecruit={onRecruit}
            onSelectUnit={onSelectUnit} onDeselectUnit={onDeselectUnit} />
        )}
        {activeTab === TABS.ECONOMY && <EconomyPanel player={player} gameState={gameState} />}
        {activeTab === TABS.MILITARY && <MilitaryPanel player={player} gameState={gameState} />}
        {activeTab === TABS.DIPLOMACY && (
          <DiplomacyPanel player={player} gameState={gameState}
            onDeclareWar={onDeclareWar} onProposeTreaty={onProposeTreaty} />
        )}
        {activeTab === TABS.RESEARCH && (
          <ResearchPanel player={player} gameState={gameState} onSetResearch={onSetResearch} />
        )}
        {activeTab === TABS.LOG && <LogPanel gameState={gameState} />}
      </div>
      {gameState.notifications.length > 0 && (
        <div className="sidepanel-notifications">
          {gameState.notifications.slice(-3).map((n, i) => (
            <div key={i} className="notification-item">{n.icon} {n.message}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ children }) {
  return <h3 className="section-header">{children}</h3>;
}

function TilePanel({ tile, player, selectedUnit, gameState, onBuild, onRecruit, onSelectUnit, onDeselectUnit }) {
  if (!tile) {
    return (
      <div className="panel-empty">
        <div className="panel-empty-icon">{'\u{1F5FA}'}</div>
        <div>Select a tile on the map to inspect it</div>
      </div>
    );
  }

  const isOwned = tile.owner === player?.id;
  const ownerNation = gameState.nations.find(n => n.id === tile.owner);

  return (
    <div>
      <div className="tile-header" style={{ borderLeftColor: tile.terrain.color }}>
        <div className="tile-terrain-name">{tile.terrain.name}</div>
        <div className="tile-coords">
          {ownerNation ? `${ownerNation.flag} ${ownerNation.name}` : 'Unclaimed'} &middot; ({tile.q}, {tile.r})
        </div>
      </div>

      <div className="tile-description">{tile.terrain.description}</div>

      {tile.resource && (
        <div className="tile-resource-badge">
          <span>{RESOURCES[tile.resource]?.icon}</span>
          <span>{RESOURCES[tile.resource]?.name || tile.resource}</span>
          <span className="tile-resource-value">Value: {RESOURCES[tile.resource]?.baseValue || '?'}</span>
        </div>
      )}

      <div className="tile-stats">
        <span>Defense: +{tile.terrain.defense}</span>
        <span>Move: {tile.terrain.moveCost}</span>
        <span>{tile.terrain.buildable ? 'Buildable' : 'Impassable'}</span>
      </div>

      {tile.buildings.length > 0 && (
        <div className="tile-section">
          <SectionHeader>Buildings</SectionHeader>
          {tile.buildings.map((b, i) => {
            const bType = BUILDINGS[b.type];
            return (
              <div key={i} className="building-card">
                <span className="building-icon">{bType?.icon}</span>
                <span className="building-name">{bType?.name || b.type}</span>
                {b.constructionLeft > 0 && (
                  <span className="building-progress">{b.constructionLeft}t left</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tile.units.length > 0 && (
        <div className="tile-section">
          <SectionHeader>Units</SectionHeader>
          {tile.units.map((u, i) => {
            const isSelected = selectedUnit?.id === u.id;
            const isOwn = u.owner === player?.id;
            return (
              <div
                key={i}
                className={`unit-card ${isSelected ? 'selected' : ''} ${isOwn ? 'own' : ''}`}
                onClick={() => isOwn && (isSelected ? onDeselectUnit() : onSelectUnit(u))}
              >
                <span className="unit-icon">{u.icon}</span>
                <div className="unit-info">
                  <span className="unit-name">
                    {u.name}
                    {u.veteranLevel > 0 && <span className="unit-vet">{'\u2605'.repeat(u.veteranLevel)}</span>}
                  </span>
                  <div className="unit-hp-bar">
                    <div className="unit-hp-fill" style={{
                      width: `${(u.hp / u.maxHp) * 100}%`,
                      background: u.hp / u.maxHp > 0.6 ? '#4a9' : u.hp / u.maxHp > 0.3 ? '#da4' : '#d44',
                    }} />
                  </div>
                </div>
                <div className="unit-stats-mini">
                  <span>{u.attack}{'\u2694'} {u.defense}{'\u{1F6E1}'}</span>
                  <span>Mv:{u.movementLeft}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isOwned && (
        <div className="tile-section">
          <SectionHeader>Construct</SectionHeader>
          {BUILDING_LIST.filter(b =>
            b.validTerrain?.includes(tile.terrain.id) &&
            !tile.buildings.some(existing => existing.type === b.id) &&
            (!b.requiresTech || player?.researchedTechs?.includes(b.requiresTech)) &&
            (!b.requiresResource || tile.resource === b.requiresResource)
          ).map(b => {
            const affordable = player ? canAfford(player.economy, b.cost) : false;
            return (
              <button key={b.id} className={`build-btn ${affordable ? 'affordable' : 'locked'}`}
                onClick={() => affordable && onBuild(tile.key, b.id)} disabled={!affordable}>
                <span className="build-icon">{b.icon}</span>
                <span className="build-name">{b.name}</span>
                <span className="build-cost">
                  {Object.entries(b.cost).map(([r, a]) => `${a} ${r}`).join(', ')}
                </span>
              </button>
            );
          })}

          {(tile.buildings.some(b => b.type === 'barracks' && b.constructionLeft === 0) ||
            tile.buildings.some(b => b.type === 'port' && b.constructionLeft === 0)) && (
            <>
              <SectionHeader>Recruit Units</SectionHeader>
              {[...LAND_UNITS, ...NAVAL_UNITS].filter(u => {
                if (u.category === 'land' && !tile.buildings.some(b => b.type === 'barracks' && b.constructionLeft === 0)) return false;
                if (u.category === 'naval' && !tile.buildings.some(b => b.type === 'port' && b.constructionLeft === 0)) return false;
                if (u.requiresTech && !player?.researchedTechs?.includes(u.requiresTech)) return false;
                return true;
              }).map(u => {
                const affordable = player ? canAfford(player.economy, u.cost) : false;
                return (
                  <button key={u.id} className={`build-btn recruit-btn ${affordable ? 'affordable' : 'locked'}`}
                    onClick={() => affordable && onRecruit(tile.key, u.id)} disabled={!affordable}>
                    <span className="build-icon">{u.icon}</span>
                    <span className="build-name">{u.name}</span>
                    <span className="build-stats">{u.attack}{'\u2694'} {u.defense}{'\u{1F6E1}'}</span>
                    <span className="build-cost">
                      {Object.entries(u.cost).map(([r, a]) => `${a} ${r}`).join(', ')}
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function EconomyPanel({ player, gameState }) {
  if (!player) return null;
  const economy = player.economy;
  const ownedTiles = Object.values(gameState.map.tiles).filter(t => t.owner === player.id);
  const net = economy.income - economy.expenses;

  return (
    <div>
      <SectionHeader>Treasury</SectionHeader>
      <div className="econ-summary">
        <div className="econ-box gold"><div className="econ-label">Gold</div><div className="econ-value">{Math.floor(economy.gold)}</div></div>
        <div className="econ-box"><div className="econ-label">Income</div><div className="econ-value positive">+{economy.income}</div></div>
        <div className="econ-box"><div className="econ-label">Expenses</div><div className="econ-value negative">-{economy.expenses}</div></div>
        <div className="econ-box"><div className="econ-label">Net</div><div className={`econ-value ${net >= 0 ? 'positive' : 'negative'}`}>{net >= 0 ? '+' : ''}{net}</div></div>
      </div>
      <SectionHeader>Empire</SectionHeader>
      <div className="econ-summary">
        <div className="econ-box"><div className="econ-label">Population</div><div className="econ-value">{economy.population.toLocaleString()}</div></div>
        <div className="econ-box"><div className="econ-label">Workers</div><div className="econ-value">{economy.workerCount}/{economy.maxWorkers}</div></div>
        <div className="econ-box"><div className="econ-label">Territory</div><div className="econ-value">{ownedTiles.length} tiles</div></div>
        <div className="econ-box"><div className="econ-label">Tax Rate</div><div className="econ-value">{(economy.taxRate * 100).toFixed(0)}%</div></div>
      </div>
      <SectionHeader>Stockpile</SectionHeader>
      <div className="resource-grid">
        {Object.entries(economy.resources).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a).map(([id, amt]) => {
          const res = RESOURCES[id];
          return (
            <div key={id} className="resource-item">
              <span className="resource-icon">{res?.icon}</span>
              <span className="resource-name">{res?.name}</span>
              <span className="resource-amt">{amt}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MilitaryPanel({ player, gameState }) {
  if (!player) return null;
  const allUnits = Object.values(gameState.map.tiles).flatMap(t => t.units).filter(u => u.owner === player.id);
  const unitCounts = {};
  for (const unit of allUnits) unitCounts[unit.type] = (unitCounts[unit.type] || 0) + 1;
  const totalUpkeep = allUnits.reduce((s, u) => s + (u.upkeep || 2), 0);

  return (
    <div>
      <SectionHeader>Armed Forces</SectionHeader>
      <div className="econ-summary">
        <div className="econ-box"><div className="econ-label">Total Units</div><div className="econ-value">{allUnits.length}</div></div>
        <div className="econ-box"><div className="econ-label">Upkeep</div><div className="econ-value negative">-{totalUpkeep}/turn</div></div>
      </div>
      <SectionHeader>Composition</SectionHeader>
      {Object.entries(unitCounts).map(([type, count]) => {
        const unit = UNITS[type];
        return (
          <div key={type} className="unit-roster-row">
            <span>{unit?.icon} {unit?.name}</span>
            <span className="unit-roster-count">\u00d7{count}</span>
          </div>
        );
      })}
      {allUnits.length === 0 && <div className="panel-muted">No military forces. Build barracks to recruit.</div>}
    </div>
  );
}

function DiplomacyPanel({ player, gameState, onDeclareWar, onProposeTreaty }) {
  if (!player) return null;
  const otherNations = gameState.nations.filter(n => n.id !== player.id && n.alive);

  return (
    <div>
      <SectionHeader>Foreign Relations</SectionHeader>
      {otherNations.map(nation => {
        const rel = player.diplomacy[nation.id];
        if (!rel) return null;
        const colors = {
          war: '#c44', hostile: '#d86', cold: '#ba8', neutral: '#888',
          friendly: '#6a6', allied: '#68c',
        };
        const statusColor = colors[rel.status] || '#888';

        return (
          <div key={nation.id} className="diplo-card">
            <div className="diplo-header">
              <span className="diplo-flag">{nation.flag}</span>
              <span className="diplo-name" style={{ color: nation.color }}>{nation.name}</span>
              <span className="diplo-status" style={{ color: statusColor, borderColor: statusColor }}>
                {rel.status.toUpperCase()}
              </span>
            </div>
            <div className="diplo-bar-track">
              <div className="diplo-bar-fill" style={{ width: `${(rel.value + 100) / 2}%`, background: statusColor }} />
              <span className="diplo-bar-label">{rel.value > 0 ? '+' : ''}{Math.floor(rel.value)}</span>
            </div>
            {rel.treaties.length > 0 && (
              <div className="diplo-treaties">
                {rel.treaties.map((t, i) => (
                  <span key={i} className="treaty-badge">{t.type.replace(/_/g, ' ')}</span>
                ))}
              </div>
            )}
            <div className="diplo-actions">
              {rel.status !== RELATION_STATUS.WAR ? (
                <>
                  <button className="diplo-btn" onClick={() => onProposeTreaty(nation.id, TREATY_TYPES.TRADE_AGREEMENT)}>Trade</button>
                  <button className="diplo-btn" onClick={() => onProposeTreaty(nation.id, TREATY_TYPES.NON_AGGRESSION)}>Pact</button>
                  <button className="diplo-btn" onClick={() => onProposeTreaty(nation.id, TREATY_TYPES.ALLIANCE)}>Alliance</button>
                  <button className="diplo-btn war" onClick={() => onDeclareWar(nation.id)}>War</button>
                </>
              ) : (
                <button className="diplo-btn peace" onClick={() => onProposeTreaty(nation.id, TREATY_TYPES.PEACE)}>Propose Peace</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ResearchPanel({ player, gameState, onSetResearch }) {
  if (!player) return null;
  const available = getAvailableTechs(player.researchedTechs || []);
  const researched = player.researchedTechs || [];

  return (
    <div>
      <SectionHeader>Research</SectionHeader>
      {player.currentResearch && (
        <div className="research-current">
          <div className="research-current-label">Researching</div>
          <div className="research-current-name">{'\u{1F52C}'} {TECHNOLOGIES[player.currentResearch]?.name}</div>
          <div className="research-bar-track">
            <div className="research-bar-fill"
              style={{ width: `${(player.researchProgress / (TECHNOLOGIES[player.currentResearch]?.cost || 100)) * 100}%` }} />
          </div>
          <div className="research-progress-text">
            {Math.floor(player.researchProgress)} / {TECHNOLOGIES[player.currentResearch]?.cost} RP
          </div>
        </div>
      )}

      <SectionHeader>Available</SectionHeader>
      {available.map(tech => (
        <button key={tech.id} className={`tech-btn ${player.currentResearch === tech.id ? 'active' : ''}`}
          onClick={() => onSetResearch(tech.id)}>
          <div className="tech-name">{tech.name}</div>
          <div className="tech-meta">{tech.category} &middot; Tier {tech.tier} &middot; {tech.cost} RP</div>
          <div className="tech-desc">{tech.description}</div>
        </button>
      ))}

      {researched.length > 0 && (
        <>
          <SectionHeader>Discovered ({researched.length})</SectionHeader>
          {researched.map(id => (
            <div key={id} className="tech-completed">\u2705 {TECHNOLOGIES[id]?.name}</div>
          ))}
        </>
      )}
    </div>
  );
}

function LogPanel({ gameState }) {
  return (
    <div>
      <SectionHeader>Chronicle</SectionHeader>
      {[...gameState.gameLog].reverse().map((entry, i) => (
        <div key={i} className="log-entry">
          <span className="log-turn">Turn {entry.turn}</span>
          <span className="log-msg">{entry.message}</span>
        </div>
      ))}
    </div>
  );
}
