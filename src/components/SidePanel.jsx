import React, { useState } from 'react';
import { BUILDINGS, BUILDING_LIST } from '../game/constants/buildingTypes.js';
import { UNITS, LAND_UNITS, NAVAL_UNITS } from '../game/constants/unitTypes.js';
import { RESOURCES } from '../game/constants/resourceTypes.js';
import { getAvailableTechs, TECHNOLOGIES } from '../game/constants/techTree.js';
import { canAfford } from '../game/engine/EconomyEngine.js';
import { TREATY_TYPES, RELATION_STATUS } from '../game/engine/DiplomacyEngine.js';

const TABS = {
  TILE: 'tile',
  ECONOMY: 'economy',
  MILITARY: 'military',
  DIPLOMACY: 'diplomacy',
  RESEARCH: 'research',
  LOG: 'log',
};

export default function SidePanel({
  gameState,
  selectedTile,
  selectedUnit,
  onBuild,
  onRecruit,
  onSelectUnit,
  onDeselectUnit,
  onDeclareWar,
  onProposeTreaty,
  onSetResearch,
}) {
  const [activeTab, setActiveTab] = useState(TABS.TILE);
  const player = gameState.nations.find(n => n.isPlayer);

  const tabs = [
    { id: TABS.TILE, label: '🗺️', title: 'Territory' },
    { id: TABS.ECONOMY, label: '💰', title: 'Economy' },
    { id: TABS.MILITARY, label: '⚔️', title: 'Military' },
    { id: TABS.DIPLOMACY, label: '🤝', title: 'Diplomacy' },
    { id: TABS.RESEARCH, label: '🔬', title: 'Research' },
    { id: TABS.LOG, label: '📜', title: 'Log' },
  ];

  return (
    <div style={{
      width: 300,
      background: '#12122a',
      borderLeft: '2px solid #333355',
      display: 'flex',
      flexDirection: 'column',
      color: '#e0e0e0',
      fontSize: 13,
      flexShrink: 0,
      overflow: 'hidden',
    }}>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #333' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            title={tab.title}
            style={{
              flex: 1,
              padding: '8px 4px',
              background: activeTab === tab.id ? '#1e1e3a' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #6688cc' : '2px solid transparent',
              color: activeTab === tab.id ? '#fff' : '#888',
              cursor: 'pointer',
              fontSize: 16,
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
        {activeTab === TABS.TILE && (
          <TilePanel
            tile={selectedTile}
            player={player}
            selectedUnit={selectedUnit}
            gameState={gameState}
            onBuild={onBuild}
            onRecruit={onRecruit}
            onSelectUnit={onSelectUnit}
            onDeselectUnit={onDeselectUnit}
          />
        )}
        {activeTab === TABS.ECONOMY && <EconomyPanel player={player} gameState={gameState} />}
        {activeTab === TABS.MILITARY && <MilitaryPanel player={player} gameState={gameState} />}
        {activeTab === TABS.DIPLOMACY && (
          <DiplomacyPanel
            player={player}
            gameState={gameState}
            onDeclareWar={onDeclareWar}
            onProposeTreaty={onProposeTreaty}
          />
        )}
        {activeTab === TABS.RESEARCH && (
          <ResearchPanel player={player} gameState={gameState} onSetResearch={onSetResearch} />
        )}
        {activeTab === TABS.LOG && <LogPanel gameState={gameState} />}
      </div>

      {/* Notifications */}
      {gameState.notifications.length > 0 && (
        <div style={{
          padding: 8,
          background: '#2a1a1a',
          borderTop: '1px solid #553333',
          maxHeight: 100,
          overflow: 'auto',
        }}>
          {gameState.notifications.slice(-3).map((n, i) => (
            <div key={i} style={{ fontSize: 11, color: '#ffaa88', marginBottom: 4 }}>
              {n.icon} {n.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TilePanel({ tile, player, selectedUnit, gameState, onBuild, onRecruit, onSelectUnit, onDeselectUnit }) {
  if (!tile) {
    return <div style={{ color: '#666', textAlign: 'center', marginTop: 40 }}>Select a tile on the map</div>;
  }

  const isOwned = tile.owner === player?.id;
  const ownerNation = gameState.nations.find(n => n.id === tile.owner);

  return (
    <div>
      <h3 style={{ margin: '0 0 8px', color: tile.terrain.color, fontSize: 15 }}>
        {tile.terrain.name}
      </h3>
      <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>
        ({tile.q}, {tile.r}) {ownerNation ? `| ${ownerNation.flag} ${ownerNation.name}` : '| Unclaimed'}
      </div>

      {tile.resource && (
        <div style={{ marginBottom: 8, padding: '4px 8px', background: '#1a1a3a', borderRadius: 4 }}>
          {RESOURCES[tile.resource]?.icon} {RESOURCES[tile.resource]?.name || tile.resource}
        </div>
      )}

      <div style={{ fontSize: 11, color: '#aaa', marginBottom: 12 }}>{tile.terrain.description}</div>

      {/* Buildings */}
      {tile.buildings.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <h4 style={{ margin: '0 0 4px', color: '#8888cc', fontSize: 12 }}>Buildings</h4>
          {tile.buildings.map((b, i) => {
            const bType = BUILDINGS[b.type];
            return (
              <div key={i} style={{
                padding: '4px 8px',
                background: '#1a1a3a',
                borderRadius: 4,
                marginBottom: 3,
                fontSize: 12,
              }}>
                {bType?.icon} {bType?.name || b.type}
                {b.constructionLeft > 0 && (
                  <span style={{ color: '#ffaa44', marginLeft: 8 }}>
                    (Building... {b.constructionLeft} turns)
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Units */}
      {tile.units.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <h4 style={{ margin: '0 0 4px', color: '#88cc88', fontSize: 12 }}>Units</h4>
          {tile.units.map((u, i) => {
            const isSelected = selectedUnit?.id === u.id;
            const isOwn = u.owner === player?.id;
            return (
              <div
                key={i}
                onClick={() => isOwn && (isSelected ? onDeselectUnit() : onSelectUnit(u))}
                style={{
                  padding: '4px 8px',
                  background: isSelected ? '#2a3a2a' : '#1a1a3a',
                  border: isSelected ? '1px solid #44ff44' : '1px solid transparent',
                  borderRadius: 4,
                  marginBottom: 3,
                  fontSize: 12,
                  cursor: isOwn ? 'pointer' : 'default',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>
                  {u.icon} {u.name}
                  {u.veteranLevel > 0 && <span style={{ color: '#ffdd44' }}> ★{u.veteranLevel}</span>}
                </span>
                <span style={{ fontSize: 10, color: '#888' }}>
                  HP: {u.hp}/{u.maxHp} | Mv: {u.movementLeft}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Build options */}
      {isOwned && (
        <div>
          <h4 style={{ margin: '0 0 4px', color: '#cccc88', fontSize: 12 }}>Build</h4>
          <div style={{ maxHeight: 150, overflow: 'auto' }}>
            {BUILDING_LIST.filter(b =>
              b.validTerrain?.includes(tile.terrain.id) &&
              !tile.buildings.some(existing => existing.type === b.id) &&
              (!b.requiresTech || player?.researchedTechs?.includes(b.requiresTech)) &&
              (!b.requiresResource || tile.resource === b.requiresResource)
            ).map(b => {
              const affordable = player ? canAfford(player.economy, b.cost) : false;
              return (
                <button
                  key={b.id}
                  onClick={() => affordable && onBuild(tile.key, b.id)}
                  disabled={!affordable}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '4px 8px',
                    background: affordable ? '#1a2a1a' : '#1a1a1a',
                    border: '1px solid ' + (affordable ? '#335533' : '#333'),
                    color: affordable ? '#aaffaa' : '#555',
                    borderRadius: 4,
                    marginBottom: 2,
                    cursor: affordable ? 'pointer' : 'not-allowed',
                    textAlign: 'left',
                    fontSize: 11,
                  }}
                >
                  {b.icon} {b.name}
                  <span style={{ float: 'right', fontSize: 10 }}>
                    {Object.entries(b.cost).map(([r, a]) => `${r}:${a}`).join(' ')}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Recruit options */}
          {(tile.buildings.some(b => b.type === 'barracks' && b.constructionLeft === 0) ||
            tile.buildings.some(b => b.type === 'port' && b.constructionLeft === 0)) && (
            <div style={{ marginTop: 8 }}>
              <h4 style={{ margin: '0 0 4px', color: '#cc8888', fontSize: 12 }}>Recruit</h4>
              {[...LAND_UNITS, ...NAVAL_UNITS].filter(u => {
                if (u.category === 'land' && !tile.buildings.some(b => b.type === 'barracks' && b.constructionLeft === 0)) return false;
                if (u.category === 'naval' && !tile.buildings.some(b => b.type === 'port' && b.constructionLeft === 0)) return false;
                if (u.requiresTech && !player?.researchedTechs?.includes(u.requiresTech)) return false;
                return true;
              }).map(u => {
                const affordable = player ? canAfford(player.economy, u.cost) : false;
                return (
                  <button
                    key={u.id}
                    onClick={() => affordable && onRecruit(tile.key, u.id)}
                    disabled={!affordable}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '4px 8px',
                      background: affordable ? '#2a1a1a' : '#1a1a1a',
                      border: '1px solid ' + (affordable ? '#553333' : '#333'),
                      color: affordable ? '#ffaaaa' : '#555',
                      borderRadius: 4,
                      marginBottom: 2,
                      cursor: affordable ? 'pointer' : 'not-allowed',
                      textAlign: 'left',
                      fontSize: 11,
                    }}
                  >
                    {u.icon} {u.name} (ATK:{u.attack} DEF:{u.defense})
                    <span style={{ float: 'right', fontSize: 10 }}>
                      {Object.entries(u.cost).map(([r, a]) => `${r}:${a}`).join(' ')}
                    </span>
                  </button>
                );
              })}
            </div>
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

  return (
    <div>
      <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Economy</h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <StatBox label="Treasury" value={`💰 ${Math.floor(economy.gold)}`} />
        <StatBox label="Income" value={`+${economy.income}`} color="#4caf50" />
        <StatBox label="Expenses" value={`-${economy.expenses}`} color="#f44336" />
        <StatBox label="Net" value={`${economy.income - economy.expenses > 0 ? '+' : ''}${economy.income - economy.expenses}`}
          color={economy.income - economy.expenses >= 0 ? '#4caf50' : '#f44336'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <StatBox label="Population" value={`👥 ${economy.population}`} />
        <StatBox label="Workers" value={`${economy.workerCount}/${economy.maxWorkers}`} />
        <StatBox label="Territory" value={`${ownedTiles.length} tiles`} />
        <StatBox label="Tax Rate" value={`${(economy.taxRate * 100).toFixed(0)}%`} />
      </div>

      <h4 style={{ margin: '12px 0 6px', color: '#8888cc', fontSize: 12 }}>Resources</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
        {Object.entries(economy.resources)
          .filter(([, v]) => v > 0)
          .sort(([, a], [, b]) => b - a)
          .map(([resId, amount]) => {
            const res = RESOURCES[resId];
            return (
              <div key={resId} style={{
                padding: '3px 6px',
                background: '#1a1a3a',
                borderRadius: 3,
                fontSize: 11,
              }}>
                {res?.icon} {res?.name}: <strong>{amount}</strong>
              </div>
            );
          })}
      </div>
    </div>
  );
}

function MilitaryPanel({ player, gameState }) {
  if (!player) return null;
  const allUnits = Object.values(gameState.map.tiles)
    .flatMap(t => t.units)
    .filter(u => u.owner === player.id);

  const unitCounts = {};
  for (const unit of allUnits) {
    unitCounts[unit.type] = (unitCounts[unit.type] || 0) + 1;
  }

  return (
    <div>
      <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Military</h3>
      <StatBox label="Total Forces" value={`⚔️ ${allUnits.length} units`} />

      <h4 style={{ margin: '12px 0 6px', color: '#cc8888', fontSize: 12 }}>Army Composition</h4>
      {Object.entries(unitCounts).map(([type, count]) => {
        const unit = UNITS[type];
        return (
          <div key={type} style={{
            padding: '4px 8px',
            background: '#1a1a3a',
            borderRadius: 4,
            marginBottom: 3,
            fontSize: 12,
            display: 'flex',
            justifyContent: 'space-between',
          }}>
            <span>{unit?.icon} {unit?.name}</span>
            <span style={{ color: '#aaa' }}>x{count}</span>
          </div>
        );
      })}

      {allUnits.length === 0 && (
        <div style={{ color: '#666', fontSize: 11, marginTop: 8 }}>
          No units. Build barracks to recruit.
        </div>
      )}
    </div>
  );
}

function DiplomacyPanel({ player, gameState, onDeclareWar, onProposeTreaty }) {
  if (!player) return null;

  const otherNations = gameState.nations.filter(n => n.id !== player.id && n.alive);

  return (
    <div>
      <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Diplomacy</h3>
      {otherNations.map(nation => {
        const rel = player.diplomacy[nation.id];
        if (!rel) return null;
        const statusColor = {
          war: '#ff4444',
          hostile: '#ff8844',
          cold: '#ccaa44',
          neutral: '#888888',
          friendly: '#44cc44',
          allied: '#4488ff',
        }[rel.status] || '#888';

        return (
          <div key={nation.id} style={{
            padding: 8,
            background: '#1a1a3a',
            borderRadius: 6,
            marginBottom: 6,
            border: `1px solid ${nation.color}44`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span>
                <span style={{ fontSize: 16 }}>{nation.flag}</span>
                <strong style={{ color: nation.color, marginLeft: 6 }}>{nation.name}</strong>
              </span>
              <span style={{ color: statusColor, fontSize: 11, fontWeight: 'bold' }}>
                {rel.status.toUpperCase()} ({rel.value > 0 ? '+' : ''}{Math.floor(rel.value)})
              </span>
            </div>

            {/* Relation bar */}
            <div style={{ height: 4, background: '#333', borderRadius: 2, marginBottom: 6 }}>
              <div style={{
                width: `${(rel.value + 100) / 2}%`,
                height: '100%',
                background: statusColor,
                borderRadius: 2,
                transition: 'width 0.3s',
              }} />
            </div>

            {/* Treaties */}
            {rel.treaties.length > 0 && (
              <div style={{ fontSize: 10, color: '#aaa', marginBottom: 6 }}>
                Treaties: {rel.treaties.map(t => t.type.replace(/_/g, ' ')).join(', ')}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {rel.status !== RELATION_STATUS.WAR && (
                <>
                  <DiplomacyButton label="Trade" onClick={() => onProposeTreaty(nation.id, TREATY_TYPES.TRADE_AGREEMENT)} />
                  <DiplomacyButton label="Non-Aggression" onClick={() => onProposeTreaty(nation.id, TREATY_TYPES.NON_AGGRESSION)} />
                  <DiplomacyButton label="Alliance" onClick={() => onProposeTreaty(nation.id, TREATY_TYPES.ALLIANCE)} />
                  <DiplomacyButton label="Declare War" onClick={() => onDeclareWar(nation.id)} color="#ff4444" />
                </>
              )}
              {rel.status === RELATION_STATUS.WAR && (
                <DiplomacyButton label="Propose Peace" onClick={() => onProposeTreaty(nation.id, TREATY_TYPES.PEACE)} color="#44cc44" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DiplomacyButton({ label, onClick, color = '#6688aa' }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '3px 8px',
        background: 'transparent',
        border: `1px solid ${color}88`,
        color,
        borderRadius: 3,
        cursor: 'pointer',
        fontSize: 10,
      }}
    >
      {label}
    </button>
  );
}

function ResearchPanel({ player, gameState, onSetResearch }) {
  if (!player) return null;

  const available = getAvailableTechs(player.researchedTechs || []);
  const researched = player.researchedTechs || [];

  return (
    <div>
      <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Research</h3>

      {player.currentResearch && (
        <div style={{
          padding: 8,
          background: '#1a1a3a',
          borderRadius: 6,
          marginBottom: 12,
          border: '1px solid #4444aa',
        }}>
          <div style={{ fontSize: 12, color: '#8888ff', marginBottom: 4 }}>Currently Researching:</div>
          <div style={{ fontWeight: 'bold' }}>
            🔬 {TECHNOLOGIES[player.currentResearch]?.name}
          </div>
          <div style={{ height: 6, background: '#333', borderRadius: 3, marginTop: 6 }}>
            <div style={{
              width: `${(player.researchProgress / (TECHNOLOGIES[player.currentResearch]?.cost || 100)) * 100}%`,
              height: '100%',
              background: '#4444ff',
              borderRadius: 3,
              transition: 'width 0.3s',
            }} />
          </div>
          <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>
            {Math.floor(player.researchProgress)} / {TECHNOLOGIES[player.currentResearch]?.cost}
          </div>
        </div>
      )}

      <h4 style={{ margin: '0 0 6px', color: '#88cc88', fontSize: 12 }}>Available Technologies</h4>
      {available.map(tech => (
        <button
          key={tech.id}
          onClick={() => onSetResearch(tech.id)}
          style={{
            display: 'block',
            width: '100%',
            padding: '6px 8px',
            background: player.currentResearch === tech.id ? '#1a2a3a' : '#1a1a2a',
            border: `1px solid ${player.currentResearch === tech.id ? '#4488cc' : '#333'}`,
            color: '#ccccee',
            borderRadius: 4,
            marginBottom: 3,
            cursor: 'pointer',
            textAlign: 'left',
            fontSize: 11,
          }}
        >
          <div style={{ fontWeight: 'bold' }}>{tech.name} <span style={{ color: '#666' }}>({tech.category})</span></div>
          <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{tech.description}</div>
          <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>Cost: {tech.cost} RP</div>
        </button>
      ))}

      {researched.length > 0 && (
        <>
          <h4 style={{ margin: '12px 0 6px', color: '#888', fontSize: 12 }}>Completed ({researched.length})</h4>
          {researched.map(id => (
            <div key={id} style={{ fontSize: 10, color: '#555', padding: '2px 0' }}>
              ✅ {TECHNOLOGIES[id]?.name}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function LogPanel({ gameState }) {
  return (
    <div>
      <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Game Log</h3>
      <div style={{ maxHeight: 500, overflow: 'auto' }}>
        {[...gameState.gameLog].reverse().map((entry, i) => (
          <div key={i} style={{
            padding: '4px 0',
            borderBottom: '1px solid #1a1a2a',
            fontSize: 11,
            color: '#aaa',
          }}>
            <span style={{ color: '#555', marginRight: 6 }}>T{entry.turn}</span>
            {entry.message}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div style={{
      padding: '6px 8px',
      background: '#1a1a3a',
      borderRadius: 4,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 10, color: '#888' }}>{label}</div>
      <div style={{ fontWeight: 'bold', color: color || '#e0e0e0', fontSize: 13 }}>{value}</div>
    </div>
  );
}
