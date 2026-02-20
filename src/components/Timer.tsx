"use client";

import { useEffect, useState, useCallback } from "react";

interface TimerProps {
    durationSeconds: number;
    isRunning: boolean;
    onTimeUp: () => void;
    onTick?: (secondsLeft: number) => void;
}

export default function Timer({
    durationSeconds,
    isRunning,
    onTimeUp,
    onTick,
}: TimerProps) {
    const [secondsLeft, setSecondsLeft] = useState(durationSeconds);

    // Reset timer when duration changes
    useEffect(() => {
        setSecondsLeft(durationSeconds);
    }, [durationSeconds]);

    const handleTimeUp = useCallback(() => {
        onTimeUp();
    }, [onTimeUp]);

    // Notify parent whenever secondsLeft changes (separate from the state update)
    useEffect(() => {
        onTick?.(secondsLeft);
    }, [secondsLeft, onTick]);

    useEffect(() => {
        if (!isRunning) return;

        if (secondsLeft <= 0) {
            handleTimeUp();
            return;
        }

        const interval = setInterval(() => {
            setSecondsLeft((prev) => prev - 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [secondsLeft, isRunning, handleTimeUp]);

    const pct = (secondsLeft / durationSeconds) * 100;
    const isLow = secondsLeft <= 10;
    const isCritical = secondsLeft <= 5;

    return (
        <div className="timer-container">
            <div className="timer-bar-bg">
                <div
                    className={`timer-bar-fill ${isCritical ? "critical" : isLow ? "low" : "normal"}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className={`timer-text ${isCritical ? "critical" : isLow ? "low" : ""}`}>
                {isCritical ? "⚡" : "⏱️"} {secondsLeft}s
            </span>
        </div>
    );
}