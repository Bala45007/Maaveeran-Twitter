import React from 'react';
import GameContainer from './components/GameContainer.jsx';
import HUD from './components/HUD.jsx';
import SpeechGate from './components/SpeechGate.jsx';
import { GameProvider } from './context/GameContext.jsx';

export default function App() {
  return (
    <GameProvider>
      <div className="fixed inset-0 bg-black overflow-hidden">
        <GameContainer />
        <HUD />
        <SpeechGate />
      </div>
    </GameProvider>
  );
}
