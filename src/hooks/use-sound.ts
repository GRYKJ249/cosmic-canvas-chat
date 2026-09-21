import { useCallback, useEffect, useState } from "react";

const KEY = "opera-sound";
let ctx: AudioContext | null = null;

function beep(freq: number, dur: number, gain = 0.04) {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(freq * 1.6, ctx.currentTime + dur);
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + dur);
  } catch {
    /* audio unavailable */
  }
}

/** Optional futuristic UI audio cues (off by default). */
export function useSound() {
  const [enabled, setEnabledState] = useState(false);
  useEffect(() => {
    setEnabledState(localStorage.getItem(KEY) === "1");
  }, []);
  const setEnabled = useCallback((v: boolean) => {
    setEnabledState(v);
    localStorage.setItem(KEY, v ? "1" : "0");
    if (v) beep(520, 0.12);
  }, []);
  const click = useCallback(() => {
    if (localStorage.getItem(KEY) === "1") beep(660, 0.08);
  }, []);
  const hum = useCallback(() => {
    if (localStorage.getItem(KEY) === "1") beep(220, 0.25, 0.02);
  }, []);
  return { enabled, setEnabled, click, hum };
}
