"use client";

import React from "react";

interface GameBoardProps {
    round: number;
    score: number;
    playerName: string;
    children: React.ReactNode;
}

export default function GameBoard({
    round,
    score,
    playerName,
    children,
}: GameBoardProps) {
    return (
        <div className="gameboard">
            {/* Top HUD */}
            <div className="gameboard-hud">
                <div className="hud-item">
                    <span className="hud-label">Player</span>
                    <span className="hud-value">{playerName}</span>
                </div>
                <div className="hud-item center">
                    <span className="hud-label">Question</span>
                    <span className="hud-value round-display">
                        {round}
                    </span>
                </div>
                <div className="hud-item right">
                    <span className="hud-label">Score</span>
                    <span className="hud-value score-display">🏆 {score} / 8</span>
                </div>
            </div>

            {/* Game content */}
            <div className="gameboard-content">{children}</div>
        </div>
    );
}
