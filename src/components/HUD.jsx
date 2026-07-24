import React from 'react';
import { Heart, Zap, Coins, Gem, Pause, Play, Volume2, VolumeX, ArrowLeft, ArrowRight, ArrowUp, Sword, Shield, Info } from 'lucide-react';
import { useGameState } from '../context/GameContext.jsx';
import { EventBus } from '../game/EventBus.js';

function HeartRow({ hearts, maxHearts }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: maxHearts }).map((_, i) => (
        <Heart
          key={i}
          size={22}
          className={i < hearts ? 'text-red-500' : 'text-white/25'}
          fill={i < hearts ? 'currentColor' : 'none'}
          strokeWidth={2}
        />
      ))}
    </div>
  );
}

function Bar({ value, max, colorClass, icon }) {
  const pct = Math.max(0, Math.min(1, value / max)) * 100;
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="text-white/90">{icon}</div>
      <div className="flex-1 h-3 bg-black/50 rounded-full border border-white/20 overflow-hidden">
        <div className={`h-full ${colorClass} transition-all duration-200`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function TouchButton({ children, onDown, onUp, className = '' }) {
  const handlers = {
    onPointerDown: (e) => { e.preventDefault(); onDown && onDown(); },
    onPointerUp: (e) => { e.preventDefault(); onUp && onUp(); },
    onPointerLeave: () => { onUp && onUp(); },
    onContextMenu: (e) => e.preventDefault()
  };
  return (
    <button
      {...handlers}
      className={`select-none rounded-full bg-white/15 active:bg-white/35 border border-white/30 backdrop-blur-sm flex items-center justify-center text-white ${className}`}
    >
      {children}
    </button>
  );
}

function ControlsHint() {
  return (
    <div className="pointer-events-none bg-black/45 border border-white/20 rounded-xl px-3 py-2 text-white text-xs leading-5 max-w-[190px] hidden sm:block">
      <div className="flex items-center gap-1 text-white/70 font-semibold mb-1">
        <Info size={12} /> HOW TO PLAY
      </div>
      <div className="flex items-center gap-2"><Sword size={13} className="text-yellow-300 shrink-0" /> <span>Get close &amp; press <b>any letter key</b> (or click) — attack!</span></div>
      <div className="flex items-center gap-2 mt-1"><Shield size={13} className="text-sky-300 shrink-0" /> <span>Hold <b>K</b> — block their attacks</span></div>
      <div className="flex items-center gap-2 mt-1"><ArrowUp size={13} className="text-emerald-300 shrink-0" /> <span><b>Space</b> — jump (tap again in air to double jump)</span></div>
    </div>
  );
}

function MobileControlsHint() {
  return (
    <div className="pointer-events-none bg-black/50 border border-white/20 rounded-xl px-3 py-1.5 text-white text-[11px] leading-4 mx-auto w-fit md:hidden">
      <div className="flex items-center gap-1.5">
        <ArrowLeft size={11} /><ArrowRight size={11} /> <span>move</span>
        <span className="text-white/40">·</span>
        <ArrowUp size={11} /> <span>jump (tap x2)</span>
        <span className="text-white/40">·</span>
        <Sword size={11} className="text-yellow-300" /> <span>attack</span>
        <span className="text-white/40">·</span>
        <Shield size={11} className="text-sky-300" /> <span>hold to block</span>
      </div>
    </div>
  );
}

export default function HUD() {
  const { hud, togglePause, sendTouch, toggleMute, chooseGameOver, continueToNextLevel, backToMenu } = useGameState();

  if (hud.screen === 'boot' || hud.screen === 'menu') return null;

  const paused = hud.screen === 'paused';
  const levelDone = hud.screen === 'levelComplete';
  const isGameOver = hud.screen === 'gameOver';

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      {/* Top HUD bar */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 p-3 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5 w-52 pixel-ui">
          <HeartRow hearts={hud.hearts} maxHearts={hud.maxHearts} />
          <Bar value={hud.energy} max={hud.maxEnergy} colorClass="bg-yellow-400" icon={<Zap size={14} fill="currentColor" />} />
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 bg-black/40 rounded-full px-3 py-1.5 border border-white/20 pixel-ui">
              <div className="flex items-center gap-1 text-yellow-300 text-sm font-bold">
                <Coins size={16} /> {hud.coins}
              </div>
              <div className="flex items-center gap-1 text-cyan-300 text-sm font-bold">
                <Gem size={16} /> {hud.gems}
              </div>
            </div>
            <div className="pointer-events-auto flex items-center gap-2">
              <button onClick={toggleMute} className="w-9 h-9 rounded-full bg-black/40 border border-white/20 text-white flex items-center justify-center">
                {hud.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <button onClick={togglePause} className="w-9 h-9 rounded-full bg-black/40 border border-white/20 text-white flex items-center justify-center">
                {paused ? <Play size={16} /> : <Pause size={16} />}
              </button>
            </div>
          </div>
          <ControlsHint />
        </div>
      </div>

      {/* Level progress bar */}
      <div className="absolute top-16 left-3 right-3 max-w-md mx-auto h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/10">
        <div className="h-full bg-emerald-400 transition-all duration-300" style={{ width: `${hud.levelProgress * 100}%` }} />
      </div>

      <div className="absolute top-20 left-0 right-0 flex justify-center px-3">
        <MobileControlsHint />
      </div>

      {/* Boss bar */}
      {hud.boss && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-72 pixel-ui">
          <div className="text-center text-white font-bold text-sm mb-1">{hud.boss.name}</div>
          <div className="h-3 bg-black/60 rounded-full border border-red-300/40 overflow-hidden">
            <div className="h-full bg-red-600 transition-all duration-200" style={{ width: `${hud.boss.healthPct * 100}%` }} />
          </div>
        </div>
      )}

      {/* Toast */}
      {hud.toast && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm animate-pulse-soft">
          {hud.toast}
        </div>
      )}

      {/* Pause overlay */}
      {paused && (
        <div className="pointer-events-auto absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-4">
          <h2 className="text-white text-3xl font-bold pixel-ui">Paused</h2>
          <button onClick={togglePause} className="px-6 py-2 rounded-full font-bold" style={{ background: '#e8c15a', color: '#0b1020' }}>
            Resume
          </button>
          <button onClick={backToMenu} className="px-6 py-2 rounded-full font-bold bg-white/10 text-white border border-white/30">
            Back to Menu
          </button>
          <p className="text-white/70 text-sm">Press ESC to resume</p>
        </div>
      )}

      {/* Game Over overlay */}
      {isGameOver && (
        <div className="pointer-events-auto absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-4">
          <Heart size={48} className="text-red-500/50" />
          <h2 className="text-white text-4xl font-bold pixel-ui">You Ran Out of Hearts</h2>
          <p className="text-white/80 text-lg">Play New Game?</p>
          <div className="flex gap-4 mt-1">
            <button
              onClick={() => chooseGameOver('newGame')}
              className="px-6 py-2 rounded-full font-bold"
              style={{ background: '#e8c15a', color: '#0b1020' }}
            >
              Yes — New Game
            </button>
            <button
              onClick={() => chooseGameOver('menu')}
              className="px-6 py-2 rounded-full font-bold bg-white/10 text-white border border-white/30"
            >
              No — Main Menu
            </button>
          </div>
        </div>
      )}

      {/* Level complete / victory overlay */}
      {levelDone && (
        <div className="pointer-events-auto absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3">
          <h2 className="text-white text-4xl font-bold pixel-ui">{hud.isFinal ? 'You Saved the Kingdom!' : 'Level Complete!'}</h2>
          <p className="text-white/90">Coins: {hud.coins} &nbsp;·&nbsp; Gems: {hud.gems}</p>
          {!hud.isFinal && (
            <p className="text-white/60 text-sm max-w-sm text-center px-6">Onward to the next level...</p>
          )}
          <div className="flex gap-3 mt-1">
            {!hud.isFinal && (
              <button
                onClick={continueToNextLevel}
                className="px-6 py-2 rounded-full font-bold"
                style={{ background: '#e8c15a', color: '#0b1020' }}
              >
                Continue
              </button>
            )}
            <button
              onClick={backToMenu}
              className={`px-6 py-2 rounded-full font-bold ${hud.isFinal ? '' : 'bg-white/10 text-white border border-white/30'}`}
              style={hud.isFinal ? { background: '#e8c15a', color: '#0b1020' } : {}}
            >
              Back to Menu
            </button>
          </div>
        </div>
      )}

      {/* Mobile touch controls + compact controls hint */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between md:hidden">
        <div className="pointer-events-auto grid grid-cols-3 gap-2 w-40">
          <div />
          <TouchButton className="w-12 h-12" onDown={() => sendTouch('jump', 'tap')}><ArrowUp size={22} /></TouchButton>
          <div />
          <TouchButton className="w-12 h-12" onDown={() => sendTouch('left', 'down')} onUp={() => sendTouch('left', 'up')}><ArrowLeft size={22} /></TouchButton>
          <div />
          <TouchButton className="w-12 h-12" onDown={() => sendTouch('right', 'down')} onUp={() => sendTouch('right', 'up')}><ArrowRight size={22} /></TouchButton>
        </div>
        <div className="pointer-events-auto flex gap-3">
          <TouchButton className="w-14 h-14" onDown={() => sendTouch('shield', 'down')} onUp={() => sendTouch('shield', 'up')}><Shield size={22} /></TouchButton>
          <TouchButton className="w-14 h-14" onDown={() => sendTouch('attack', 'tap')}><Sword size={22} /></TouchButton>
        </div>
      </div>
    </div>
  );
}
