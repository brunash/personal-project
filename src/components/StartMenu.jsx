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

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, #1a1a3a 0%, #0a0a15 70%)',
      fontFamily: 'Georgia, serif',
    }}>
      <div style={{
        background: '#12122aee',
        border: '2px solid #333366',
        borderRadius: 12,
        padding: '40px 50px',
        maxWidth: 600,
        width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        <h1 style={{
          textAlign: 'center',
          color: '#c8a840',
          margin: '0 0 4px',
          fontSize: 36,
          letterSpacing: 3,
          textShadow: '0 2px 10px rgba(200,168,64,0.3)',
        }}>
          IMPERIALISM
        </h1>
        <h2 style={{
          textAlign: 'center',
          color: '#6688aa',
          margin: '0 0 30px',
          fontSize: 14,
          fontWeight: 'normal',
          letterSpacing: 6,
          textTransform: 'uppercase',
        }}>
          Reborn
        </h2>

        {/* Nation Selection */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ color: '#8888cc', fontSize: 12, display: 'block', marginBottom: 6 }}>
            Choose Your Nation
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {NATION_TEMPLATES.map((nation, i) => (
              <button
                key={nation.id}
                onClick={() => setSettings(s => ({ ...s, playerNation: i }))}
                style={{
                  padding: '8px 12px',
                  background: settings.playerNation === i ? `${nation.color}33` : '#1a1a2a',
                  border: `2px solid ${settings.playerNation === i ? nation.color : '#333'}`,
                  borderRadius: 6,
                  color: settings.playerNation === i ? '#fff' : '#aaa',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ fontSize: 14 }}>
                  <span style={{ marginRight: 6 }}>{nation.flag}</span>
                  <strong style={{ color: nation.color }}>{nation.name}</strong>
                </div>
                <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
                  {nation.description.slice(0, 50)}...
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div>
            <label style={{ color: '#8888cc', fontSize: 12, display: 'block', marginBottom: 4 }}>Map Size</label>
            <select
              value={`${settings.mapWidth}x${settings.mapHeight}`}
              onChange={e => {
                const [w, h] = e.target.value.split('x').map(Number);
                setSettings(s => ({ ...s, mapWidth: w, mapHeight: h }));
              }}
              style={selectStyle}
            >
              <option value="35x28">Small (35x28)</option>
              <option value="50x40">Medium (50x40)</option>
              <option value="70x55">Large (70x55)</option>
              <option value="90x70">Epic (90x70)</option>
            </select>
          </div>

          <div>
            <label style={{ color: '#8888cc', fontSize: 12, display: 'block', marginBottom: 4 }}>AI Opponents</label>
            <select
              value={settings.numAI}
              onChange={e => setSettings(s => ({ ...s, numAI: parseInt(e.target.value) }))}
              style={selectStyle}
            >
              {[3, 5, 7].map(n => (
                <option key={n} value={n}>{n} Nations</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ color: '#8888cc', fontSize: 12, display: 'block', marginBottom: 4 }}>Difficulty</label>
            <select
              value={settings.difficulty}
              onChange={e => setSettings(s => ({ ...s, difficulty: e.target.value }))}
              style={selectStyle}
            >
              <option value="easy">Easy</option>
              <option value="normal">Normal</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div>
            <label style={{ color: '#8888cc', fontSize: 12, display: 'block', marginBottom: 4 }}>Map Seed</label>
            <input
              type="number"
              value={settings.seed}
              onChange={e => setSettings(s => ({ ...s, seed: parseInt(e.target.value) || 0 }))}
              style={{
                ...selectStyle,
                width: '100%',
              }}
            />
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={() => onStartGame(settings)}
          style={{
            width: '100%',
            padding: '14px',
            background: 'linear-gradient(180deg, #c8a840 0%, #a08030 100%)',
            border: '2px solid #d4b850',
            borderRadius: 8,
            color: '#1a1a1a',
            fontSize: 18,
            fontWeight: 'bold',
            fontFamily: 'Georgia, serif',
            cursor: 'pointer',
            letterSpacing: 2,
            transition: 'all 0.2s',
            textTransform: 'uppercase',
          }}
          onMouseEnter={e => {
            e.target.style.background = 'linear-gradient(180deg, #d8b850 0%, #b09040 100%)';
            e.target.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={e => {
            e.target.style.background = 'linear-gradient(180deg, #c8a840 0%, #a08030 100%)';
            e.target.style.transform = 'scale(1)';
          }}
        >
          Begin Your Empire
        </button>

        <div style={{ textAlign: 'center', marginTop: 16, color: '#444', fontSize: 11 }}>
          Procedurally generated world | Smart AI opponents | Open-ended gameplay
        </div>
      </div>
    </div>
  );
}

const selectStyle = {
  width: '100%',
  padding: '6px 8px',
  background: '#1a1a2a',
  border: '1px solid #333366',
  borderRadius: 4,
  color: '#e0e0e0',
  fontSize: 13,
};
