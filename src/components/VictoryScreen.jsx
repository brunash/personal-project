import React from 'react';

export default function VictoryScreen({ gameState, onRestart }) {
  const winner = gameState.nations.find(n => n.id === gameState.winner);
  const isPlayerWinner = winner?.isPlayer;
  const rankedNations = [...gameState.nations].filter(n => n.alive).sort((a, b) => b.score - a.score);

  const victoryLabel = {
    domination: 'Military Domination',
    economic: 'Economic Supremacy',
    diplomatic: 'Diplomatic Victory',
  }[gameState.victoryType] || 'Victory';

  return (
    <div className={`victory-bg ${isPlayerWinner ? 'win' : 'lose'}`}>
      <div className="victory-card" style={{ border: `2px solid ${isPlayerWinner ? 'var(--gold)' : 'var(--red)'}` }}>
        <h1 style={{
          fontFamily: "'Cinzel', serif", fontSize: 40, letterSpacing: 6,
          color: isPlayerWinner ? 'var(--gold)' : 'var(--red)', marginBottom: 8,
        }}>
          {isPlayerWinner ? 'VICTORY' : 'DEFEAT'}
        </h1>
        <div style={{ fontSize: 16, color: 'var(--text-dim)', marginBottom: 24 }}>
          {winner?.flag} {winner?.name} achieves <strong style={{ color: 'var(--gold)' }}>{victoryLabel}</strong>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
          Year {1800 + gameState.turn} &middot; Turn {gameState.turn} &middot; {rankedNations.length} nations survived
        </div>

        <div style={{ textAlign: 'left', marginBottom: 24 }}>
          <h3 className="section-header">Final Rankings</h3>
          {rankedNations.map((nation, i) => (
            <div key={nation.id} className="unit-roster-row" style={{
              background: nation.isPlayer ? 'rgba(80,160,80,0.08)' : 'var(--bg-card)',
              border: nation.isPlayer ? '1px solid var(--green)' : '1px solid var(--border)',
            }}>
              <span>
                <span style={{ color: 'var(--text-muted)', marginRight: 8 }}>#{i + 1}</span>
                {nation.flag} <strong style={{ color: nation.color }}>{nation.name}</strong>
              </span>
              <span style={{ color: 'var(--text-dim)' }}>{Math.floor(nation.score)} pts</span>
            </div>
          ))}
        </div>

        <button className="start-play-btn" onClick={onRestart} style={{ fontSize: 15 }}>
          Play Again
        </button>
      </div>
    </div>
  );
}
