/** Simple Web Audio API sound effects (no external files). */
const GameAudio = (function () {
  let ctx = null;

  function ensureContext() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (_) {
        return null;
      }
    }
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    return ctx;
  }

  function tone(freq, duration, type, volume, freqEnd) {
    const ac = ensureContext();
    if (!ac) return;
    const t0 = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type || "square";
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd != null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t0 + duration);
    }
    gain.gain.setValueAtTime(volume ?? 0.08, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + duration);
  }

  return {
    init() {
      ensureContext();
    },
    jump() {
      tone(320, 0.12, "square", 0.06, 480);
    },
    coin() {
      tone(880, 0.08, "square", 0.07);
      setTimeout(() => tone(1320, 0.1, "square", 0.06), 60);
    },
    stomp() {
      tone(180, 0.15, "square", 0.08, 80);
    },
    bump() {
      tone(220, 0.06, "triangle", 0.05);
    },
    hurt() {
      tone(120, 0.35, "sawtooth", 0.1, 60);
    },
    win() {
      [523, 659, 784, 1047].forEach((f, i) => {
        setTimeout(() => tone(f, 0.2, "square", 0.07), i * 120);
      });
    },
    flag() {
      tone(440, 0.25, "triangle", 0.08, 880);
    },
  };
})();
