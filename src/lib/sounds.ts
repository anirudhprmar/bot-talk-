/**
 * Sound effects & Text-to-Speech for AI Brain Blast.
 * 
 * SFX: Web Audio API with warm, musical tones
 * TTS: Browser SpeechSynthesis (can be swapped for Piper/OpenAI TTS later)
 * 
 * TTS speaks SELECTIVELY — only questions and short hype reactions,
 * not the entire bot response.
 */

// ── Audio Context (lazy-initialized) ──────────────────────────
let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
    if (!audioCtx) audioCtx = new AudioContext();
    return audioCtx;
}

// ── Warm tone helper ──────────────────────────────────────────
function playNote(
    freq: number,
    startTime: number,
    duration: number,
    type: OscillatorType = "sine",
    vol: number = 0.08
) {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // Warm filter to soften harsh tones
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2000, startTime);

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    // Smooth envelope: fade in, sustain, fade out
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(vol, startTime + 0.03);
    gain.gain.setValueAtTime(vol, startTime + duration * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration);
}

// ── Game Sound Effects ────────────────────────────────────────

/** Warm ascending chime — correct answer ✅ */
export function playCorrectSound() {
    const ctx = getCtx();
    const now = ctx.currentTime;
    // C major arpeggio: C5, E5, G5, C6 — gentle and satisfying
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
        playNote(freq, now + i * 0.1, 0.35, "sine", 0.07);
    });
}

/** Soft descending tone — wrong answer ❌ */
export function playWrongSound() {
    const ctx = getCtx();
    const now = ctx.currentTime;
    // Gentle two-note descend: E4 → C4
    playNote(329.63, now, 0.25, "triangle", 0.06);
    playNote(261.63, now + 0.2, 0.35, "triangle", 0.06);
}

/** Soft tick for timer countdown */
export function playTickSound() {
    const ctx = getCtx();
    const now = ctx.currentTime;
    playNote(1200, now, 0.06, "sine", 0.03);
}

/** Warm fanfare — game start 🎬 */
export function playStartSound() {
    const ctx = getCtx();
    const now = ctx.currentTime;
    // G4, B4, D5, G5 — a warm major chord arpeggio
    const notes = [392, 493.88, 587.33, 783.99];
    notes.forEach((freq, i) => {
        playNote(freq, now + i * 0.13, 0.4, "sine", 0.06);
    });
}

/** Alert tone — time's up ⏰ */
export function playTimeUpSound() {
    const ctx = getCtx();
    const now = ctx.currentTime;
    // Three soft beeps
    for (let i = 0; i < 3; i++) {
        playNote(440, now + i * 0.18, 0.12, "sine", 0.05);
    }
}

// ── Selective Text-to-Speech ──────────────────────────────────

/**
 * Extract only the speakable parts from a bot response:
 * - The question itself (if asking one)
 * - Short hype phrases / reactions
 * Skips long explanations and filler.
 */
function extractSpeakableContent(text: string): string {
    // Clean markup first
    let clean = text
        .replace(/\[CORRECT\]/gi, "")
        .replace(/\[WRONG\]/gi, "")
        .replace(/\*\*/g, "")
        .replace(/\*/g, "")
        .replace(/#{1,6}\s/g, "")
        .replace(/\[[\w\s.!]+\]/g, "")  // stage directions
        .replace(/[🎯💥🏆🔥⏰⚡🧠🎮✅❌🎬🌟⚠️🎉💪🚀🏁🤔😱😂🤩👏🎵🎶]/gu, "")
        .trim();

    const lines = clean.split("\n").map(l => l.trim()).filter(Boolean);
    const speakLines: string[] = [];

    for (const line of lines) {
        // Skip very short filler lines
        if (line.length < 3) continue;

        // Always include lines with question marks (the actual question)
        if (line.includes("?")) {
            speakLines.push(line);
            continue;
        }

        // Include answer options A), B), C), D)
        if (/^[A-D][).:]/.test(line)) {
            speakLines.push(line);
            continue;
        }

        // Include short hype/reaction phrases (under 80 chars)
        if (line.length <= 80) {
            speakLines.push(line);
            continue;
        }
    }

    // Cap at ~200 words to keep it snappy
    const result = speakLines.join(". ");
    const words = result.split(/\s+/);
    if (words.length > 200) {
        return words.slice(0, 200).join(" ");
    }
    return result;
}

/**
 * Speak selected parts of the bot's response.
 * Uses browser SpeechSynthesis — swap this function body
 * to use Piper TTS or OpenAI TTS API for better quality.
 */
export function speakBotResponse(fullText: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const speakable = extractSpeakableContent(fullText);
    if (!speakable || speakable.length < 5) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(speakable);
    utterance.rate = 1.05;     // Slightly energetic
    utterance.pitch = 1.05;    // Slightly warm
    utterance.volume = 0.85;

    // Pick the best available English voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
        v => v.lang.startsWith("en") && v.localService && v.name.toLowerCase().includes("google")
    ) || voices.find(
        v => v.lang.startsWith("en") && !v.localService  // cloud voices tend to sound better
    ) || voices.find(
        v => v.lang.startsWith("en")
    );
    if (preferred) utterance.voice = preferred;

    window.speechSynthesis.speak(utterance);
}

/** Stop speaking immediately */
export function stopSpeaking() {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
}

/** Speak a short reaction phrase (for correct/wrong/timeUp) */
export function speakReaction(phrase: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.rate = 1.2;
    utterance.pitch = 1.15;
    utterance.volume = 0.9;

    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith("en")) || null;
    if (voice) utterance.voice = voice;

    window.speechSynthesis.speak(utterance);
}