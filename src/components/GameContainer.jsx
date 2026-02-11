import React, { useState, useCallback } from 'react';
import HexMap from './HexMap.jsx';
import TopBar from './TopBar.jsx';
import SidePanel from './SidePanel.jsx';
import VictoryScreen from './VictoryScreen.jsx';
import {
  endTurn,
  playerBuild,
  playerRecruit,
  playerMoveUnit,
  playerDeclareWar,
  playerProposeTreaty,
  playerSetResearch,
} from '../game/engine/GameEngine.js';

export default function GameContainer({ initialGameState }) {
  const [gameState, setGameState] = useState(initialGameState);
  const [selectedTile, setSelectedTile] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [turnReport, setTurnReport] = useState(null);

  const updateState = useCallback(() => {
    setGameState(gs => ({ ...gs }));
  }, []);

  const handleTileClick = useCallback((tile) => {
    if (selectedUnit) {
      // Try to move unit
      const result = playerMoveUnit(gameState, selectedUnit.id, tile.q, tile.r);
      if (result.success) {
        if (result.combat) {
          gameState.notifications.push({
            type: 'combat',
            icon: '⚔️',
            message: `Battle result: ${result.combat.winner}`,
          });
        }
        setSelectedUnit(null);
        updateState();
      } else {
        // Just select the tile
        setSelectedUnit(null);
        setSelectedTile(tile);
      }
    } else {
      setSelectedTile(tile);
      // Auto-select own unit if there's only one
      const player = gameState.nations.find(n => n.isPlayer);
      if (player && tile.units.length === 1 && tile.units[0].owner === player.id) {
        setSelectedUnit(tile.units[0]);
      } else {
        setSelectedUnit(null);
      }
    }
  }, [gameState, selectedUnit, updateState]);

  const handleUnitMove = useCallback((unitId, targetQ, targetR) => {
    const result = playerMoveUnit(gameState, unitId, targetQ, targetR);
    if (result.success) {
      setSelectedUnit(null);
      updateState();
    }
  }, [gameState, updateState]);

  const handleEndTurn = useCallback(() => {
    const report = endTurn(gameState);
    setTurnReport(report);
    // Refresh selected tile data
    if (selectedTile) {
      const refreshed = gameState.map.tiles[selectedTile.key];
      setSelectedTile(refreshed || null);
    }
    setSelectedUnit(null);
    updateState();
  }, [gameState, selectedTile, updateState]);

  const handleBuild = useCallback((tileKey, buildingId) => {
    const result = playerBuild(gameState, tileKey, buildingId);
    if (result.success) {
      // Refresh selected tile
      const refreshed = gameState.map.tiles[tileKey];
      setSelectedTile(refreshed);
      updateState();
    } else {
      gameState.notifications.push({ type: 'error', icon: '❌', message: result.message });
      updateState();
    }
  }, [gameState, updateState]);

  const handleRecruit = useCallback((tileKey, unitTypeId) => {
    const result = playerRecruit(gameState, tileKey, unitTypeId);
    if (result.success) {
      const refreshed = gameState.map.tiles[tileKey];
      setSelectedTile(refreshed);
      updateState();
    } else {
      gameState.notifications.push({ type: 'error', icon: '❌', message: result.message });
      updateState();
    }
  }, [gameState, updateState]);

  const handleDeclareWar = useCallback((targetId) => {
    const result = playerDeclareWar(gameState, targetId);
    if (result.success) {
      gameState.notifications.push({ type: 'war', icon: '⚔️', message: result.message });
      updateState();
    }
  }, [gameState, updateState]);

  const handleProposeTreaty = useCallback((targetId, treatyType) => {
    const result = playerProposeTreaty(gameState, targetId, treatyType);
    const msg = result.accepted ? `Treaty accepted: ${treatyType}` : `Treaty rejected: ${result.reason}`;
    gameState.notifications.push({ type: 'diplomacy', icon: result.accepted ? '🤝' : '😤', message: msg });
    updateState();
  }, [gameState, updateState]);

  const handleSetResearch = useCallback((techId) => {
    const result = playerSetResearch(gameState, techId);
    if (result.success) {
      gameState.notifications.push({ type: 'research', icon: '🔬', message: result.message });
      updateState();
    }
  }, [gameState, updateState]);

  if (gameState.gameOver) {
    return <VictoryScreen gameState={gameState} onRestart={() => window.location.reload()} />;
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#0a0a15',
      overflow: 'hidden',
    }}>
      <TopBar gameState={gameState} onEndTurn={handleEndTurn} />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Map */}
        <div style={{ flex: 1, position: 'relative' }}>
          <HexMap
            gameState={gameState}
            onTileClick={handleTileClick}
            onUnitMove={handleUnitMove}
            selectedTile={selectedTile}
            selectedUnit={selectedUnit}
          />

          {/* Active Events Banner */}
          {gameState.activeEvents.length > 0 && (
            <div style={{
              position: 'absolute',
              top: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: 8,
              pointerEvents: 'none',
            }}>
              {gameState.activeEvents
                .filter(e => e.targetNation === gameState.nations.find(n => n.isPlayer)?.id)
                .slice(0, 3)
                .map((evt, i) => (
                  <div key={i} style={{
                    background: '#1a1a2eee',
                    padding: '6px 14px',
                    borderRadius: 6,
                    border: '1px solid #554422',
                    fontSize: 12,
                    color: '#ffcc88',
                  }}>
                    {evt.icon} {evt.name} ({evt.turnsLeft}t)
                  </div>
                ))}
            </div>
          )}

          {/* Mini map / info at bottom-right */}
          <div style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            background: '#1a1a2ecc',
            padding: 8,
            borderRadius: 6,
            border: '1px solid #333',
            fontSize: 11,
            color: '#888',
          }}>
            <div>Zoom: Scroll | Pan: Drag | Click: Select</div>
            {selectedUnit && (
              <div style={{ color: '#44ff44', marginTop: 4 }}>
                {selectedUnit.icon} {selectedUnit.name} selected - click to move
                <button
                  onClick={() => setSelectedUnit(null)}
                  style={{
                    marginLeft: 8,
                    padding: '1px 6px',
                    background: '#333',
                    border: '1px solid #555',
                    color: '#aaa',
                    borderRadius: 3,
                    cursor: 'pointer',
                    fontSize: 10,
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Side Panel */}
        <SidePanel
          gameState={gameState}
          selectedTile={selectedTile}
          selectedUnit={selectedUnit}
          onBuild={handleBuild}
          onRecruit={handleRecruit}
          onSelectUnit={setSelectedUnit}
          onDeselectUnit={() => setSelectedUnit(null)}
          onDeclareWar={handleDeclareWar}
          onProposeTreaty={handleProposeTreaty}
          onSetResearch={handleSetResearch}
        />
      </div>
    </div>
  );
}
