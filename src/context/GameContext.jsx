import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { EventBus } from '../game/EventBus.js';
import { SaveManager } from '../game/managers/SaveManager.js';
import { AudioManager } from '../game/managers/AudioManager.js';

const GameStateContext = createContext(null);

const initialHud = {
  screen: 'boot', // boot | menu | playing | paused | levelComplete | gameOver
  hearts: 5,
  maxHearts: 5,
  energy: 100,
  maxEnergy: 100,
  coins: 0,
  gems: 0,
  levelProgress: 0,
  boss: null, // { name, healthPct }
  toast: null,
  muted: false
};

export function GameProvider({ children }) {
  const [hud, setHud] = useState(initialHud);
  const toastTimer = useRef(null);

  const showToast = useCallback((message) => {
    setHud((h) => ({ ...h, toast: message }));
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setHud((h) => ({ ...h, toast: null })), 2200);
  }, []);

  useEffect(() => {
    const onMenu = () => setHud((h) => ({ ...h, screen: 'menu' }));
    const onUpdate = (data) => setHud((h) => {
      const lockedScreens = ['paused', 'gameOver', 'levelComplete'];
      return { ...h, ...data, screen: lockedScreens.includes(h.screen) ? h.screen : 'playing' };
    });
    const onPause = (paused) => setHud((h) => (h.screen === 'gameOver' ? h : { ...h, screen: paused ? 'paused' : 'playing' }));
    const onToast = (msg) => showToast(msg);
    const onBossStart = (info) => setHud((h) => ({ ...h, boss: { name: info.name, healthPct: 1 }, screen: 'playing' }));
    const onBossHealth = (pct) => setHud((h) => (h.boss ? { ...h, boss: { ...h.boss, healthPct: pct } } : h));
    const onBossEnd = () => setHud((h) => ({ ...h, boss: null }));
    const onLevelComplete = (data) => setHud((h) => ({ ...h, screen: 'levelComplete', coins: data.coins, gems: data.gems, isFinal: !!data.isFinal }));
    const onGameOver = () => setHud((h) => ({ ...h, screen: 'gameOver' }));
    const onLevelStart = () => setHud((h) => ({ ...h, screen: 'playing', boss: null, toast: null }));

    EventBus.on('hud:menu', onMenu);
    EventBus.on('hud:update', onUpdate);
    EventBus.on('hud:pause', onPause);
    EventBus.on('hud:toast', onToast);
    EventBus.on('hud:boss-start', onBossStart);
    EventBus.on('hud:boss-health', onBossHealth);
    EventBus.on('hud:boss-end', onBossEnd);
    EventBus.on('hud:level-complete', onLevelComplete);
    EventBus.on('hud:game-over', onGameOver);
    EventBus.on('hud:level-start', onLevelStart);

    return () => {
      EventBus.off('hud:menu', onMenu);
      EventBus.off('hud:update', onUpdate);
      EventBus.off('hud:pause', onPause);
      EventBus.off('hud:toast', onToast);
      EventBus.off('hud:boss-start', onBossStart);
      EventBus.off('hud:boss-health', onBossHealth);
      EventBus.off('hud:boss-end', onBossEnd);
      EventBus.off('hud:level-complete', onLevelComplete);
      EventBus.off('hud:game-over', onGameOver);
      EventBus.off('hud:level-start', onLevelStart);
    };
  }, [showToast]);

  const togglePause = useCallback(() => {
    EventBus.emit('input:pause-toggle');
  }, []);

  const sendTouch = useCallback((key, type) => {
    EventBus.emit('input:touch', { key, type });
  }, []);

  const chooseGameOver = useCallback((choice) => {
    // choice: 'newGame' | 'menu'
    setHud((h) => ({ ...h, screen: 'playing' }));
    EventBus.emit('input:game-over-choice', choice);
  }, []);

  const continueToNextLevel = useCallback(() => {
    // Reset screen locally before the next scene loads, or the "levelComplete"
    // overlay stays stuck since hud:update from the new level won't override
    // a locked screen state on its own.
    setHud((h) => ({ ...h, screen: 'playing', boss: null }));
    EventBus.emit('input:next-level');
  }, []);

  const backToMenu = useCallback(() => {
    setHud((h) => ({ ...h, screen: 'playing', boss: null }));
    EventBus.emit('input:back-to-menu');
  }, []);

  const toggleMute = useCallback(() => {
    setHud((h) => {
      const muted = !h.muted;
      AudioManager.setMuted(muted);
      const save = SaveManager.load();
      SaveManager.save({ settings: { ...save.settings, muted } });
      return { ...h, muted };
    });
  }, []);

  const value = { hud, togglePause, sendTouch, toggleMute, chooseGameOver, continueToNextLevel, backToMenu };
  return <GameStateContext.Provider value={value}>{children}</GameStateContext.Provider>;
}

export function useGameState() {
  const ctx = useContext(GameStateContext);
  if (!ctx) throw new Error('useGameState must be used within GameProvider');
  return ctx;
}
