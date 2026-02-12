import React from 'react';
import { RESOURCES } from '../game/constants/resourceTypes.js';
import { TECHNOLOGIES } from '../game/constants/techTree.js';

export default function TopBar({ gameState, onEndTurn }) {
  const player = gameState.nations.find(n => n.isPlayer);
  if (!player) return null;

  const economy = player.economy;
  const net = economy.income - economy.expenses;

  return (
    <div className="topbar">
      {/* Left: Nation identity */}
      <div className="topbar-section topbar-nation">
        <span className="topbar-flag">{player.flag}</span>
        <div>
          <div className="topbar-nation-name" style={{ color: player.color }}>{player.name}</div>
          <div className="topbar-turn">Year {1800 + gameState.turn} &middot; Turn {gameState.turn}</div>
        </div>
      </div>

      {/* Center: Resources */}
      <div className="topbar-section topbar-resources">
        <ResourceBadge icon="\u{1F4B0}" value={Math.floor(economy.gold)} label="Treasury" highlight
          trend={net} />
        <div className="topbar-divider" />
        <ResourceBadge icon={RESOURCES.grain?.icon} value={economy.resources.grain || 0} label="Grain" />
        <ResourceBadge icon={RESOURCES.timber?.icon} value={economy.resources.timber || 0} label="Timber" />
        <ResourceBadge icon={RESOURCES.iron?.icon} value={economy.resources.iron || 0} label="Iron" />
        <ResourceBadge icon={RESOURCES.coal?.icon} value={economy.resources.coal || 0} label="Coal" />
        <ResourceBadge icon={RESOURCES.steel?.icon} value={economy.resources.steel || 0} label="Steel" />
        <ResourceBadge icon={RESOURCES.arms?.icon} value={economy.resources.arms || 0} label="Arms" />
        <div className="topbar-divider" />
        <ResourceBadge icon="\u{1F465}" value={economy.population} label="Population" />
        <ResourceBadge
          icon={economy.stability > 60 ? '\u{1F7E2}' : economy.stability > 30 ? '\u{1F7E1}' : '\u{1F534}'}
          value={Math.floor(economy.stability)}
          label="Stability"
          color={economy.stability > 60 ? '#6dba6d' : economy.stability > 30 ? '#d4a844' : '#c45050'}
        />
      </div>

      {/* Right: Research + End Turn */}
      <div className="topbar-section topbar-right">
        {player.currentResearch && (
          <div className="topbar-research">
            <div className="topbar-research-label">
              {'\u{1F52C}'} {TECHNOLOGIES[player.currentResearch]?.name || player.currentResearch.replace(/_/g, ' ')}
            </div>
            <div className="topbar-research-bar">
              <div
                className="topbar-research-fill"
                style={{ width: `${(player.researchProgress / (TECHNOLOGIES[player.currentResearch]?.cost || 100)) * 100}%` }}
              />
            </div>
            <div className="topbar-research-text">
              {Math.floor(player.researchProgress)} / {TECHNOLOGIES[player.currentResearch]?.cost || '?'}
            </div>
          </div>
        )}
        <button className="topbar-end-turn" onClick={onEndTurn}>
          <span>End Turn</span>
          <span className="topbar-end-turn-arrow">\u25B6</span>
        </button>
      </div>
    </div>
  );
}

function ResourceBadge({ icon, value, label, trend, color, highlight }) {
  const displayValue = value >= 10000 ? `${(value / 1000).toFixed(0)}k` : value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value;
  return (
    <div className={`res-badge ${highlight ? 'res-badge-gold' : ''}`} title={label}>
      <span className="res-badge-icon">{icon}</span>
      <div>
        <span className="res-badge-value" style={color ? { color } : undefined}>{displayValue}</span>
        {trend !== undefined && trend !== 0 && (
          <span className={`res-badge-trend ${trend > 0 ? 'positive' : 'negative'}`}>
            {trend > 0 ? '+' : ''}{trend}
          </span>
        )}
      </div>
    </div>
  );
}
