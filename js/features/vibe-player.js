// The Impact gate's "press play" easter egg: a one-shot track tied to the
// gate button, handed off to a persistent corner control once launched.
// Scoped to about.html only for now — no cross-page persistence yet.

const TRACK_SRC = 'assets/audio/jesus-walks.mp3';
const TARGET_VOLUME = 0.15;
// Starting the ramp at 0 reads as a long dead-silence beat before anything
// happens — sound should be there the instant playback starts, then ease
// up to the target level rather than fading in from nothing.
const INTRO_VOLUME = TARGET_VOLUME * 0.20;
const VOLUME_FADE_MS = 10000;
const VOLUME_FADE_MARGIN_S = 10;
// Same arrive grammar the Impact cards themselves use (impact-card-surface-
// arrive/impact-card-content-arrive in css/layout.css) — a plain decelerate,
// no elastic overshoot, so the button reads as one more card settling in
// rather than a UI widget popping open.
const ARRIVE_EASE = 'cubic-bezier(0.22, 0.82, 0.28, 1)';
const RECEDE_EASE = 'cubic-bezier(0.6, 0, 0.9, 0.2)';

// The "01" label and the gate button live in separate panels but are meant
// to read as one composed block. Their left edges already share the same
// CSS inset, but the label's right edge only lines up with the button's
// text by coincidence of content length — so when an admin has set exactly
// two characters (like "01"), spread them to genuinely span from the
// icon's left edge to the text's right edge instead of leaving that to
// chance. Both elements share the identical scroll-driven transform, so a
// single measurement is transform-invariant regardless of scroll position.
function alignGateLabelToButton(gateBtn) {
  const shutterRight = document.querySelector('.scroll-chapter__shutter--right');
  const label = shutterRight?.querySelector('.scroll-chapter__shutter-label');
  const dot = gateBtn.querySelector('.vibe-gate-btn__dot');
  const text = gateBtn.querySelector('.vibe-gate-btn__text');
  if (!shutterRight || !label || !dot || !text) return;

  const raw = label.textContent.trim();
  if (raw.length !== 2) return;

  label.innerHTML = `<span>${raw[0]}</span><span>${raw[1]}</span>`;
  label.style.display = 'flex';
  label.style.justifyContent = 'space-between';

  const apply = () => {
    if (!matchMedia('(min-width: 901px)').matches) return;
    const shutterRect = shutterRight.getBoundingClientRect();
    const iconRect = dot.getBoundingClientRect();
    const textRect = text.getBoundingClientRect();
    label.style.left = `${iconRect.left - shutterRect.left}px`;
    label.style.width = `${textRect.right - iconRect.left}px`;
  };
  apply();
  window.addEventListener('resize', apply);
}

export function initVibePlayer() {
  const gateBtn = document.querySelector('.vibe-gate-btn');
  if (!gateBtn) return;

  alignGateLabelToButton(gateBtn);

  // Web Audio graph setup: iOS Safari ignores HTMLMediaElement.volume entirely
  // and plays HTMLMediaElement at 100% volume directly. Pre-decoding to an
  // AudioBufferSourceNode connected to GainNode guarantees 100% sample-accurate
  // volume control and fading on iOS Safari/iPad as well as desktop browsers.
  let audioCtx = null;
  let gainNode = null;
  let audioBuffer = null;
  let sourceNode = null;
  let isPreloading = false;
  let isPlaying = false;
  let isPaused = false;
  let startAudioTime = 0;
  let pauseOffset = 0;
  let fadingOut = false;

  const preloadAudio = async () => {
    if (audioBuffer || isPreloading) return;
    isPreloading = true;
    try {
      const res = await fetch(TRACK_SRC);
      const arrayBuffer = await res.arrayBuffer();
      const ctx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (!audioCtx) audioCtx = ctx;
      audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[vibe-player] Audio buffer preload error:', err);
    } finally {
      isPreloading = false;
    }
  };

  const preloadObserver = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    void preloadAudio();
    preloadObserver.disconnect();
  }, { rootMargin: '200% 0px' });
  preloadObserver.observe(gateBtn);

  const ensureAudioGraph = () => {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (!gainNode) {
      gainNode = audioCtx.createGain();
      const now = audioCtx.currentTime;
      gainNode.gain.setValueAtTime(INTRO_VOLUME, now);
      gainNode.connect(audioCtx.destination);
    }
  };

  const player = document.createElement('button');
  player.type = 'button';
  player.className = 'vibe-player';
  player.setAttribute('aria-label', 'Pause the track');
  player.innerHTML = `
    <span class="vibe-player__icon" aria-hidden="true"></span>
    <span class="vibe-player__label">JESUS WALKS</span>
  `;
  document.body.append(player);

  const setPlayerState = paused => {
    isPaused = paused;
    player.classList.toggle('is-paused', paused);
    player.setAttribute('aria-label', paused ? 'Play the track' : 'Pause the track');
  };

  const playBufferFrom = async (offset = 0) => {
    ensureAudioGraph();
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
    if (!audioBuffer) {
      await preloadAudio();
      if (!audioBuffer) throw new Error('Audio decoding failed');
    }
    if (sourceNode) {
      try { sourceNode.stop(); } catch {}
    }

    const now = audioCtx.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(INTRO_VOLUME, now);
    gainNode.gain.linearRampToValueAtTime(TARGET_VOLUME, now + (VOLUME_FADE_MS / 1000));

    sourceNode = audioCtx.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(gainNode);

    startAudioTime = now - offset;
    sourceNode.start(0, offset);
    isPlaying = true;
    setPlayerState(false);

    sourceNode.onended = () => {
      const elapsed = audioCtx.currentTime - startAudioTime;
      if (audioBuffer && elapsed >= audioBuffer.duration - 0.5) {
        isPlaying = false;
        pauseOffset = 0;
        setPlayerState(true);
      }
    };
  };

  const monitorFadeOut = () => {
    if (!isPlaying || isPaused || fadingOut || !audioBuffer || !audioCtx) return;
    const elapsed = audioCtx.currentTime - startAudioTime;
    if (elapsed >= audioBuffer.duration - VOLUME_FADE_MARGIN_S) {
      fadingOut = true;
      const now = audioCtx.currentTime;
      const currentGain = gainNode.gain.value;
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(currentGain, now);
      gainNode.gain.linearRampToValueAtTime(0, now + (VOLUME_FADE_MS / 1000));
    } else {
      requestAnimationFrame(monitorFadeOut);
    }
  };

  const launch = async () => {
    gateBtn.disabled = true;
    const ring = gateBtn.querySelector('.vibe-gate-btn__ring');
    const inner = gateBtn.querySelector('.vibe-gate-btn__inner') || gateBtn;

    gateBtn.classList.add('is-launching');

    // Ensure AudioGraph starts synchronously inside user tap gesture
    ensureAudioGraph();

    const audioReady = (async () => {
      await playBufferFrom(0);
      requestAnimationFrame(monitorFadeOut);
    })();

    const atInner = (y, scale) => `translateY(${y}px) scale(${scale})`;

    // Phase 1: grow toward the viewer in place (animated on inner container so
    // gateBtn retains its CSS scroll animation without breaking door lockstep).
    await inner.animate(
      [{ transform: atInner(0, 1) }, { transform: atInner(0, 1.25) }],
      { duration: 250, easing: ARRIVE_EASE, fill: 'forwards' },
    ).finished;

    gateBtn.classList.add('is-playing');

    // Phase 2: shrink back into a single point in place.
    await inner.animate(
      [
        { transform: atInner(0, 1.25), opacity: 1 },
        { transform: atInner(0, 0), opacity: 0 },
      ],
      { duration: 280, easing: RECEDE_EASE, fill: 'forwards' },
    ).finished;

    try {
      await audioReady;
    } catch (err) {
      // Autoplay/decoding refused after all — restore gate button.
      // eslint-disable-next-line no-console
      console.warn('[vibe-player] Launch playback error:', err);
      inner.getAnimations().forEach(anim => anim.cancel());
      gateBtn.classList.remove('is-launching', 'is-playing');
      gateBtn.disabled = false;
      return;
    }

    gateBtn.style.display = 'none';
    if (ring) ring.style.animation = 'none';

    // Phase 3: corner control rises into place.
    player.classList.add('is-visible');
    player.animate(
      [
        { transform: 'translateY(14px) scale(0)' },
        { transform: 'translateY(0) scale(1)' },
      ],
      { duration: 420, easing: ARRIVE_EASE },
    );
  };

  gateBtn.addEventListener('click', () => { void launch(); }, { once: true });

  player.addEventListener('click', () => {
    if (!audioCtx) return;
    if (isPaused) {
      void playBufferFrom(pauseOffset);
    } else {
      pauseOffset = Math.max(0, audioCtx.currentTime - startAudioTime);
      if (sourceNode) {
        try { sourceNode.stop(); } catch {}
      }
      setPlayerState(true);
    }
  });
}
