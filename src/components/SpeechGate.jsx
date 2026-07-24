import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Mic, MicOff } from 'lucide-react';
import { EventBus } from '../game/EventBus.js';

const DEFAULT_PHRASE = 'Abra Ka Dabra';

function normalize(text) {
  return text.toLowerCase().replace(/[^a-z]/g, '');
}

// Fuzzy match against whichever phrase this gate was opened with (each level
// has its own word: "Abra Ka Dabra", "Shazam", "Dracarys"). Checks normalized
// containment either direction, plus a loose prefix/length check so speech
// recognizers that mangle a syllable or two still pass.
function isMagicWord(transcript, targetPhrase) {
  const norm = normalize(transcript);
  const target = normalize(targetPhrase || DEFAULT_PHRASE);
  if (!norm || !target) return false;
  if (norm.includes(target) || target.includes(norm)) return true;
  if (target.length >= 4 && norm.length >= 4) {
    if (norm.slice(0, 4) === target.slice(0, 4) && Math.abs(norm.length - target.length) <= 3) return true;
  }
  return false;
}

export default function SpeechGate() {
  const [visible, setVisible] = useState(false);
  const [phrase, setPhrase] = useState(DEFAULT_PHRASE);
  const [status, setStatus] = useState('idle'); // idle | listening | unsupported | denied | success
  const recognitionRef = useRef(null);
  const phraseRef = useRef(DEFAULT_PHRASE);

  useEffect(() => {
    const onShow = (data) => {
      const p = (data && data.phrase) || DEFAULT_PHRASE;
      phraseRef.current = p;
      setPhrase(p);
      setVisible(true);
      setStatus('idle');
    };
    const onHide = () => { setVisible(false); stopListening(); };
    EventBus.on('hud:speech-gate-show', onShow);
    EventBus.on('hud:speech-gate-hide', onHide);
    return () => {
      EventBus.off('hud:speech-gate-show', onShow);
      EventBus.off('hud:speech-gate-hide', onHide);
      stopListening();
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    startListening();
    // Keyboard fallback: Enter also opens the gate
    const onKey = (e) => { if (e.key === 'Enter') succeed(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setStatus('unsupported');
      return;
    }
    try {
      const recognition = new SR();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (isMagicWord(transcript, phraseRef.current)) {
            succeed();
            return;
          }
        }
      };
      recognition.onerror = (event) => {
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setStatus('denied');
        }
      };
      recognition.onend = () => {
        // Auto-restart while the gate is still open (browsers stop after a
        // pause) unless we've already succeeded or the gate closed.
        if (recognitionRef.current === recognition && visible) {
          try { recognition.start(); } catch { /* already starting */ }
        }
      };
      recognition.start();
      recognitionRef.current = recognition;
      setStatus('listening');
    } catch {
      setStatus('unsupported');
    }
  }

  function stopListening() {
    if (recognitionRef.current) {
      const r = recognitionRef.current;
      recognitionRef.current = null;
      try { r.stop(); } catch { /* no-op */ }
    }
  }

  function succeed() {
    setStatus((s) => {
      if (s === 'success') return s;
      stopListening();
      EventBus.emit('input:speech-gate-success');
      return 'success';
    });
  }

  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-28">
      <div className="pointer-events-auto bg-black/75 border border-[#e8c15a]/60 rounded-2xl px-6 py-5 max-w-sm text-center shadow-xl">
        <div className="flex items-center justify-center gap-2 text-[#e8c15a] mb-2">
          <Sparkles size={20} />
          <span className="font-bold text-sm tracking-wide">THE GATE IS SEALED</span>
          <Sparkles size={20} />
        </div>
        <p className="text-white text-lg mb-1">Speak the magic word:</p>
        <p className="text-[#e8c15a] text-2xl font-extrabold mb-3">"{phrase}!"</p>

        {status === 'listening' && (
          <p className="text-emerald-300 text-sm flex items-center justify-center gap-1 mb-3 animate-pulse-soft">
            <Mic size={14} /> Listening… say it out loud!
          </p>
        )}
        {status === 'unsupported' && (
          <p className="text-white/70 text-xs flex items-center justify-center gap-1 mb-3">
            <MicOff size={14} /> Voice input isn't available on this browser/device
          </p>
        )}
        {status === 'denied' && (
          <p className="text-white/70 text-xs flex items-center justify-center gap-1 mb-3">
            <MicOff size={14} /> Microphone access was blocked
          </p>
        )}
        {status === 'success' && (
          <p className="text-emerald-300 text-sm mb-3">The gate is opening…</p>
        )}

        <button
          onClick={succeed}
          disabled={status === 'success'}
          className="px-5 py-2 rounded-full font-bold text-sm disabled:opacity-60"
          style={{ background: '#e8c15a', color: '#0b1020' }}
        >
          Speak and  press Enter
        </button>
      </div>
    </div>
  );
}
