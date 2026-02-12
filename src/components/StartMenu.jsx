import React, { useState } from 'react';
import { NATION_TEMPLATES } from '../game/constants/nationProfiles.js';

export default function StartMenu({ onStartGame }) {
  const [settings, setSettings] = useState({
    mapWidth: 50,
    mapHeight: 40,
    numAI: 7,
    playerNation: 0,
    difficulty: 'normal',
    seed: Math.floor(Math.random() * 100000),
  });

  const [hoveredNation, setHoveredNation] = useState(null);

  return (
    <div className="start-bg">
      {/* Decorative compass rose background */}
      <div className="start-compass" />

      <div className="start-card">
        {/* Header */}
        <div className="start-header">
          <div className="start-ornament">\u2726 \u2726 \u2726</div>
          <h1 className="start-title">IMPERIALISM</h1>
          <h2 className="start-subtitle">REBORN</h2>
          <div className="start-ornament">\u2014\u2014\u2014 Anno Domini \u2014\u2014\u2014</div>
        </div>

        {/* Nation Selection */}
        <div className="start-section">
          <label className="start-label">Choose Your Nation</label>
          <div className="start-nations-grid">
            {NATION_TEMPLATES.map((nation, i) => (
              <button
                key={nation.id}
                className={`start-nation-btn ${settings.playerNation === i ? 'selected' : ''}`}
                onClick={() => setSettings(s => ({ ...s, playerNation: i }))}
                onMouseEnter={() => setHoveredNation(nation)}
                onMouseLeave={() => setHoveredNation(null)}
                style={{
                  '--nation-color': nation.color,
                  borderColor: settings.playerNation === i ? nation.color : 'transparent',
                }}
              >
                <span className="start-nation-flag">{nation.flag}</span>
                <div>
                  <div className="start-nation-name" style={{ color: nation.color }}>{nation.name}</div>
                  <div className="start-nation-type">{nation.template?.personality || 'balanced'}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Nation detail preview */}
          {hoveredNation && (
            <div className="start-nation-preview">
              <div className="start-nation-preview-name">{hoveredNation.flag} {hoveredNation.name}</div>
              <div className="start-nation-preview-desc">{hoveredNation.description}</div>
              <div className="start-nation-preview-traits">
                {Object.entries(hoveredNation.traits || {}).map(([k, v]) => (
                  <span key={k} className="trait-badge" style={{ opacity: 0.5 + v * 0.35 }}>
                    {k}: {v.toFixed(1)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="start-section">
          <div className="start-settings-grid">
            <div className="start-field">
              <label className="start-label">Map Size</label>
              <select
                className="start-select"
                value={`${settings.mapWidth}x${settings.mapHeight}`}
                onChange={e => {
                  const [w, h] = e.target.value.split('x').map(Number);
                  setSettings(s => ({ ...s, mapWidth: w, mapHeight: h }));
                }}
              >
                <option value="35x28">Small (35\u00d728)</option>
                <option value="50x40">Medium (50\u00d740)</option>
                <option value="70x55">Large (70\u00d755)</option>
                <option value="90x70">Epic (90\u00d770)</option>
              </select>
            </div>
            <div className="start-field">
              <label className="start-label">Opponents</label>
              <select
                className="start-select"
                value={settings.numAI}
                onChange={e => setSettings(s => ({ ...s, numAI: parseInt(e.target.value) }))}
              >
                {[3, 5, 7].map(n => (
                  <option key={n} value={n}>{n} Nations</option>
                ))}
              </select>
            </div>
            <div className="start-field">
              <label className="start-label">Difficulty</label>
              <select
                className="start-select"
                value={settings.difficulty}
                onChange={e => setSettings(s => ({ ...s, difficulty: e.target.value }))}
              >
                <option value="easy">Apprentice</option>
                <option value="normal">Governor</option>
                <option value="hard">Emperor</option>
              </select>
            </div>
            <div className="start-field">
              <label className="start-label">World Seed</label>
              <input
                type="number"
                className="start-select"
                value={settings.seed}
                onChange={e => setSettings(s => ({ ...s, seed: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>
        </div>

        {/* Start */}
        <button className="start-play-btn" onClick={() => onStartGame(settings)}>
          <span className="start-play-text">Begin Your Empire</span>
        </button>

        <div className="start-footer">
          Procedurally generated world &middot; Intelligent AI opponents &middot; Open-ended sandbox gameplay
        </div>
      </div>
    </div>
  );
}
