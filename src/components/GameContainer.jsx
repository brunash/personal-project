import React, { useState, useCallback } from 'react';
import HexMap from './HexMap.jsx';
import TopBar from './TopBar.jsx';
import SidePanel from './SidePanel.jsx';
import VictoryScreen from './VictoryScreen.jsx';
import {
  endTurn, playerBuild, playerRecruit, playerMoveUnit,
  playerDeclareWar, playerProposeTreaty, playerSetResearch,
} from '../game/engine/GameEngine.js';

export default function GameContainer({ initialGameState }) {
  const [gameState, setGameState] = useState(initialGameState);
  const [selectedTile, setSelectedTile] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);

  const updateState = useCallback(() => {
    setGameState(gs => ({ ...gs }));
  }, []);

  const handleTileClick = useCallback((tile) => {
    if (selectedUnit) {
      const result = playerMoveUnit(gameState, selectedUnit.id, tile.q, tile.r);
      if (result.success) {
        if (result.combat) {
          gameState.notifications.push({
            type: 'combat', icon: '\u2694\uFE0F',
            message: `Battle result: ${result.combat.winner}`,
          });
        }
        setSelectedUnit(null);
        updateState();
      } else {
        setSelectedUnit(null);
        setSelectedTile(tile);
      }
    } else {
      setSelectedTile(tile);
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
    endTurn(gameState);
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
      setSelectedTile(gameState.map.tiles[tileKey]);
    } else {
      gameState.notifications.push({ type: 'error', icon: '\u274C', message: result.message });
    }
    updateState();
  }, [gameState, updateState]);

  const handleRecruit = useCallback((tileKey, unitTypeId) => {
    const result = playerRecruit(gameState, tileKey, unitTypeId);
    if (result.success) {
      setSelectedTile(gameState.map.tiles[tileKey]);
    } else {
      gameState.notifications.push({ type: 'error', icon: '\u274C', message: result.message });
    }
    updateState();
  }, [gameState, updateState]);

  const handleDeclareWar = useCallback((targetId) => {
    const result = playerDeclareWar(gameState, targetId);
    if (result.success) {
      gameState.notifications.push({ type: 'war', icon: '\u2694\uFE0F', message: result.message });
    }
    updateState();
  }, [gameState, updateState]);

  const handleProposeTreaty = useCallback((targetId, treatyType) => {
    const result = playerProposeTreaty(gameState, targetId, treatyType);
    const msg = result.accepted ? `Treaty accepted: ${treatyType.replace(/_/g,' ')}` : `Treaty rejected: ${result.reason}`;
    gameState.notifications.push({ type: 'diplomacy', icon: result.accepted ? '\u{1F91D}' : '\u{1F624}', message: msg });
    updateState();
  }, [gameState, updateState]);

  const handleSetResearch = useCallback((techId) => {
    const result = playerSetResearch(gameState, techId);
    if (result.success) {
      gameState.notifications.push({ type: 'research', icon: '\u{1F52C}', message: result.message });
    }
    updateState();
  }, [gameState, updateState]);

  if (gameState.gameOver) {
    return <VictoryScreen gameState={gameState} onRestart={() => window.location.reload()} />;
  }

  const playerEvents = gameState.activeEvents
    .filter(e => e.targetNation === gameState.nations.find(n => n.isPlayer)?.id)
    .slice(0, 3);

  return (
    <div className="game-container">
      <TopBar gameState={gameState} onEndTurn={handleEndTurn} />
      <div className="game-main">
        <div className="game-map-area">
          <HexMap
            gameState={gameState}
            onTileClick={handleTileClick}
            onUnitMove={handleUnitMove}
            selectedTile={selectedTile}
            selectedUnit={selectedUnit}
          />
          {playerEvents.length > 0 && (
            <div className="event-banner">
              {playerEvents.map((evt, i) => (
                <div key={i} className="event-badge">
                  {evt.icon} {evt.name} ({evt.turnsLeft}t)
                </div>
              ))}
            </div>
          )}
        </div>
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
