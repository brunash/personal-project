import React from 'react';

export default function VictoryScreen({ gameState, onRestart }) {
  const winner = gameState.nations.find(n => n.id === gameState.winner);
  const isPlayerWinner = winner?.isPlayer;

  const rankedNations = [...gameState.nations]
    .filter(n => n.alive)
    .sort((a, b) => b.score - a.score);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: isPlayerWinner
        ? 'radial-gradient(ellipse at center, #1a2a1a 0%, #0a0a15 70%)'
        : 'radial-gradient(ellipse at center, #2a1a1a 0%, #0a0a15 70%)',
      fontFamily: 'Georgia, serif',
    }}>
      <div style={{
        background: '#12122aee',
        border: `2px solid ${isPlayerWinner ? '#44aa44' : '#aa4444'}`,
        borderRadius: 12,
        padding: '40px 50px',
        maxWidth: 500,
        width: '90%',
        textAlign: 'center',
      }}>
        <h1 style={{
          color: isPlayerWinner ? '#c8a840' : '#aa4444',
          fontSize: 32,
          marginBottom: 8,
        }}>
          {isPlayerWinner ? 'VICTORY!' : 'DEFEAT'}
        </h1>

        <h2 style={{ color: '#6688aa', fontSize: 16, fontWeight: 'normal', marginBottom: 24 }}>
          {winner?.flag} {winner?.name} wins by{' '}
          <span style={{ color: '#c8a840' }}>
            {gameState.victoryType === 'domination' ? 'Military Domination' :
             gameState.victoryType === 'economic' ? 'Economic Supremacy' :
             gameState.victoryType === 'diplomatic' ? 'Diplomatic Victory' : 'Victory'}
          </span>
        </h2>

        <div style={{ marginBottom: 24, fontSize: 14, color: '#aaa' }}>
          Turn {gameState.turn} | {gameState.nations.filter(n => n.alive).length} nations survived
        </div>

        {/* Rankings */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ color: '#8888cc', fontSize: 14, marginBottom: 8 }}>Final Rankings</h3>
          {rankedNations.map((nation, i) => (
            <div key={nation.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '6px 12px',
              background: nation.isPlayer ? '#1a2a1a' : '#1a1a2a',
              borderRadius: 4,
              marginBottom: 3,
              border: nation.isPlayer ? '1px solid #335533' : '1px solid transparent',
            }}>
              <span>
                <span style={{ color: '#666', marginRight: 8 }}>#{i + 1}</span>
                {nation.flag} <strong style={{ color: nation.color }}>{nation.name}</strong>
              </span>
              <span style={{ color: '#888' }}>{Math.floor(nation.score)} pts</span>
            </div>
          ))}
        </div>

        <button
          onClick={onRestart}
          style={{
            padding: '12px 40px',
            background: 'linear-gradient(180deg, #4a6fa5 0%, #3a5a8a 100%)',
            border: '2px solid #5a7fb5',
            borderRadius: 8,
            color: '#fff',
            fontSize: 16,
            fontWeight: 'bold',
            fontFamily: 'Georgia, serif',
            cursor: 'pointer',
            letterSpacing: 1,
          }}
        >
          Play Again
        </button>
      </div>
    </div>
  );
}
