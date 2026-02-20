import { create } from 'zustand';
import { GameState, INITIAL_GAME_STATE, resetGame as baseResetGame } from './gameState';

interface GameStore {
    game: GameState;
    setGame: (updater: Partial<GameState> | ((prev: GameState) => Partial<GameState>)) => void;
    ttsEnabled: boolean;
    setTtsEnabled: (updater: boolean | ((prev: boolean) => boolean)) => void;
    resetGame: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
    game: INITIAL_GAME_STATE,
    setGame: (updater) => set((state) => ({
        game: {
            ...state.game,
            ...(typeof updater === 'function' ? updater(state.game) : updater)
        }
    })),
    ttsEnabled: true,
    setTtsEnabled: (updater) => set((state) => ({
        ttsEnabled: typeof updater === 'function' ? updater(state.ttsEnabled) : updater
    })),
    resetGame: () => set({ game: baseResetGame() }),
}));
