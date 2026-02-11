import React, { useState } from 'react';
import StartMenu from './components/StartMenu.jsx';
import GameContainer from './components/GameContainer.jsx';
import { createNewGame } from './game/engine/GameEngine.js';

export default function App() {
  const [gameState, setGameState] = useState(null);

  const handleStartGame = (settings) => {
    const state = createNewGame(settings);
    setGameState(state);
  };

  if (!gameState) {
    return <StartMenu onStartGame={handleStartGame} />;
  }

  return <GameContainer initialGameState={gameState} />;
}
