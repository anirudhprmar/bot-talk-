export type GamePhase = "welcome" | "hype" | "playing" | "result";

export interface Message {
    role: "user" | "assistant";
    content: string;
}

export interface GameState {
    phase: GamePhase;
    playerName: string;
    score: number;
    round: number;
    messages: Message[];
    timerSeconds: number;
    isTimerRunning: boolean;
    isStreaming: boolean;
    isWaitingForNext: boolean;
    result: "win" | "lose" | null;
    currentQuestion: import("./questions").Question | null;
    askedQuestions: number[];
}

export const TIMER_DURATION = 60; // seconds per question
export const WIN_THRESHOLD = 8; // need 8 correct to win

export const INITIAL_GAME_STATE: GameState = {
    phase: "welcome",
    playerName: "",
    score: 0,
    round: 1,
    messages: [],
    timerSeconds: TIMER_DURATION,
    isTimerRunning: false,
    isStreaming: false,
    isWaitingForNext: false,
    result: null,
    currentQuestion: null,
    askedQuestions: [],
};

export function resetGame(): GameState {
    return { ...INITIAL_GAME_STATE, messages: [] };
}

export function determineResult(score: number): "win" | "lose" {
    return score >= WIN_THRESHOLD ? "win" : "lose";
}
