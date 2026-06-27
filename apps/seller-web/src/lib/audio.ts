/**
 * New-order alert sound via the Web Audio API.
 *
 * We synthesise a two-note chime with an oscillator rather than loading an mp3
 * so there's no asset to ship and no <audio> autoplay-policy fight. The browser
 * still requires a prior user gesture before audio can play, so call
 * `unlockAudio()` from the first tap (e.g. the "Enable alerts" button or the
 * ONLINE toggle).
 */

let audioCtx: AudioContext | null = null
let loopTimer: ReturnType<typeof setInterval> | null = null

type WebkitWindow = typeof window & { webkitAudioContext?: typeof AudioContext }

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext
    if (!Ctor) return null
    audioCtx = new Ctor()
  }
  return audioCtx
}

/** Resume/create the AudioContext. Must run inside a user gesture handler. */
export function unlockAudio(): boolean {
  const ctx = getCtx()
  if (!ctx) return false
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx.state !== 'suspended'
}

/** Play a single three-note chime. */
function chime() {
  const ctx = getCtx()
  if (!ctx || ctx.state === 'suspended') return
  const now = ctx.currentTime

  // Run all oscillators through a compressor so we can push gain without clipping.
  const compressor = ctx.createDynamicsCompressor()
  compressor.threshold.setValueAtTime(-6, now)
  compressor.knee.setValueAtTime(3, now)
  compressor.ratio.setValueAtTime(6, now)
  compressor.attack.setValueAtTime(0.001, now)
  compressor.release.setValueAtTime(0.15, now)
  compressor.connect(ctx.destination)

  const notes = [880, 1174.66, 1318.51] // A5 → D6 → E6 (bright major feel)
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    const start = now + i * 0.16
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.9, start + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35)
    osc.connect(gain).connect(compressor)
    osc.start(start)
    osc.stop(start + 0.37)
  })
}

/** Start the repeating alert chime (until {@link stopAlertChime}). */
export function playAlertChime() {
  stopAlertChime()
  const ctx = getCtx()
  if (!ctx) return

  const start = () => {
    chime()
    loopTimer = setInterval(chime, 1500)
  }

  // AudioContext is auto-suspended when the tab loses focus. Resume it first
  // so the chime plays even if the seller returns to a hidden tab.
  if (ctx.state === 'suspended') {
    void ctx.resume().then(start).catch(() => {})
  } else {
    start()
  }
}

/** Silence the alert chime. */
export function stopAlertChime() {
  if (loopTimer) {
    clearInterval(loopTimer)
    loopTimer = null
  }
}
