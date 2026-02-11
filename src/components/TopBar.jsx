import React from 'react';
import { RESOURCES } from '../game/constants/resourceTypes.js';
import { TECHNOLOGIES } from '../game/constants/techTree.js';

export default function TopBar({ gameState, onEndTurn }) {
  const player = gameState.nations.find(n => n.isPlayer);
  if (!player) return null;

  const economy = player.economy;
  const importantResources = ['grain', 'timber', 'iron', 'coal', 'steel', 'arms', 'gold'];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'linear-gradient(180deg, #1a1a2e 0%, #16162a 100%)',
      borderBottom: '2px solid #333355',
      padding: '6px 16px',
      color: '#e0e0e0',
      fontSize: 13,
      height: 42,
      gap: 8,
      flexShrink: 0,
    }}>
      {/* Nation info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>{player.flag}</span>
        <span style={{ fontWeight: 'bold', color: player.color }}>{player.name}</span>
        <span style={{ color: '#888', fontSize: 11 }}>Turn {gameState.turn}</span>
      </div>

      {/* Resources */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, justifyContent: 'center' }}>
        {/* Gold */}
        <ResourceBadge icon="💰" value={Math.floor(economy.gold)} label="Gold"
          trend={economy.income - economy.expenses} />

        {importantResources.filter(r => r !== 'gold').map(resId => {
          const res = RESOURCES[resId];
          if (!res) return null;
          return (
            <ResourceBadge
              key={resId}
              icon={res.icon}
              value={economy.resources[resId] || 0}
              label={res.name}
            />
          );
        })}

        <span style={{ color: '#666', margin: '0 4px' }}>|</span>

        {/* Population */}
        <ResourceBadge icon="👥" value={economy.population} label="Population" />
        <ResourceBadge icon="😊" value={Math.floor(economy.stability)} label="Stability"
          color={economy.stability > 60 ? '#4caf50' : economy.stability > 30 ? '#ff9800' : '#f44336'} />
      </div>

      {/* Research */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {player.currentResearch && (
          <span style={{ fontSize: 11, color: '#8888ff' }}>
            🔬 {player.currentResearch.replace(/_/g, ' ')}
            <span style={{ color: '#666', marginLeft: 4 }}>
              ({Math.floor(player.researchProgress)}/{TECHNOLOGIES[player.currentResearch]?.cost || '?'})
            </span>
          </span>
        )}
      </div>

      {/* End Turn */}
      <button
        onClick={onEndTurn}
        style={{
          background: 'linear-gradient(180deg, #4a6fa5 0%, #3a5a8a 100%)',
          border: '1px solid #5a7fb5',
          color: '#fff',
          padding: '6px 20px',
          borderRadius: 4,
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: 13,
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => e.target.style.background = 'linear-gradient(180deg, #5a8fc5 0%, #4a7aaa 100%)'}
        onMouseLeave={e => e.target.style.background = 'linear-gradient(180deg, #4a6fa5 0%, #3a5a8a 100%)'}
      >
        End Turn ⏭
      </button>
    </div>
  );
}

function ResourceBadge({ icon, value, label, trend, color }) {
  const displayValue = value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }} title={label}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ color: color || '#e0e0e0', fontWeight: 'bold', fontSize: 12 }}>{displayValue}</span>
      {trend !== undefined && trend !== 0 && (
        <span style={{ fontSize: 10, color: trend > 0 ? '#4caf50' : '#f44336' }}>
          {trend > 0 ? '+' : ''}{trend}
        </span>
      )}
    </div>
  );
}
