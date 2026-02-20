"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import GameBoard from "@/components/GameBoard";
import Timer from "@/components/Timer";
import ChatBubble from "@/components/ChatBubble";
import {
  TIMER_DURATION,
  Message,
} from "@/lib/gameState";
import {
  getFirstQuestionPrompt,
  getNextQuestionPrompt,
} from "@/lib/prompts";
import { getRandomQuestion } from "@/lib/questions";
import {
  speakBotResponse,
  speakReaction,
  stopSpeaking,
  playCorrectSound,
  playWrongSound,
  playStartSound,
  playTimeUpSound,
  playTickSound,
} from "@/lib/sounds";
import { useGameStore } from "@/lib/store";

export default function Home() {
  const { game, setGame, ttsEnabled, setTtsEnabled, resetGame } = useGameStore();
  const [input, setInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const currentTimeLeft = useRef(TIMER_DURATION);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [game.messages]);

  // Focus input when playing
  useEffect(() => {
    if (game.phase === "playing" && !game.isStreaming) {
      inputRef.current?.focus();
    }
  }, [game.phase, game.isStreaming]);

  // ── Stream a message from the API ──────────────────────────────────
  const streamMessage = useCallback(
    async (
      messages: Message[],
      round: number,
      score: number,
      promptType: "question" | "reaction"
    ) => {
      setGame((prev) => ({ ...prev, isStreaming: true }));

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages,
            playerName: game.playerName,
            round,
            score,
            timeLeft: currentTimeLeft.current,
          }),
        });

        if (!res.body) throw new Error("No response body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";

        // Add empty assistant message to fill in
        setGame((prev) => ({
          ...prev,
          messages: [...prev.messages, { role: "assistant", content: "" }],
        }));

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") break;

              try {
                const parsed = JSON.parse(data);
                if (parsed.error) {
                  fullContent += parsed.error;
                } else if (parsed.content) {
                  fullContent += parsed.content;
                }

                // Update the last assistant message with streamed content
                setGame((prev) => {
                  const msgs = [...prev.messages];
                  msgs[msgs.length - 1] = {
                    role: "assistant",
                    content: fullContent,
                  };
                  return { ...prev, messages: msgs };
                });
              } catch {
                // skip unparseable lines
              }
            }
          }
        }

        // Evaluate logic ONLY if this is a reaction prompt,
        // otherwise it's just a question and we shouldn't arbitrarily look for markers.
        let newScore = score;
        let newRound = round;
        let hasCorrect = false;
        let hasWrong = false;

        if (promptType === "reaction") {
          const upperContent = fullContent.toUpperCase();
          hasCorrect = upperContent.includes("[CORRECT]");
          hasWrong = upperContent.includes("[WRONG]");

          // Fallback: If LLM failed to explicitly bracket a marker, guess from text or default to wrong
          if (!hasCorrect && !hasWrong) {
            if (upperContent.includes("CORRECT") || upperContent.includes("RIGHT!")) {
              hasCorrect = true;
            } else {
              hasWrong = true; // Default fallback to keep game un-stuck
            }
          }

          if (hasCorrect) {
            newScore = score + 1;
            playCorrectSound();
          } else if (hasWrong) {
            playWrongSound();
          }

          if (hasCorrect || hasWrong) {
            newRound = round + 1;
          }
        }

        // Selectively speak the bot's response
        if (ttsEnabled && fullContent) {
          if (hasCorrect) {
            speakReaction("Yes! That's correct! Amazing!");
          } else if (hasWrong) {
            speakReaction("Oh no, that's wrong! Better luck next time!");
          } else if (promptType === "question") {
            // Only speak general response if it's a question, preventing accidental audio
            speakBotResponse(fullContent);
          }
        }

        // Check if game is over
        if (newScore >= 8) {
          setGame((prev) => ({
            ...prev,
            score: newScore,
            round: newRound,
            isStreaming: false,
            isTimerRunning: false,
            phase: "result",
            result: "win",
          }));
        } else if (newRound > 8 && promptType === "reaction") {
          // If they just finished question 8 and didn't hit 8 score, they lose
          setGame((prev) => ({
            ...prev,
            score: newScore,
            round: newRound,
            isStreaming: false,
            isTimerRunning: false,
            phase: "result",
            result: "lose",
          }));
        } else if (hasCorrect || hasWrong) {
          // Pause timer and wait for manual "Next Question" click
          setGame((prev) => ({
            ...prev,
            score: newScore,
            round: newRound,
            isStreaming: false,
            isTimerRunning: false,
            isWaitingForNext: true,
          }));
        } else if (promptType === "question") {
          // This must be the question itself, start timer!
          setGame((prev) => ({
            ...prev,
            score: newScore,
            round: newRound,
            isStreaming: false,
            isTimerRunning: true,
            timerSeconds: TIMER_DURATION,
          }));
          currentTimeLeft.current = TIMER_DURATION;
        }
      } catch (error) {
        console.error("Stream error:", error);
        setGame((prev) => ({
          ...prev,
          isStreaming: false,
          messages: [
            ...prev.messages,
            {
              role: "assistant",
              content:
                "⚠️ Couldn't connect to Ollama! Make sure it's running: ollama serve",
            },
          ],
        }));
      }
    },
    [game.playerName, ttsEnabled]
  );

  // ── Start the game ─────────────────────────────────────────────────
  const handleStartGame = () => {
    if (!nameInput.trim()) return;

    playStartSound();

    setGame((prev) => ({
      ...prev,
      playerName: nameInput.trim(),
      phase: "hype",
    }));

    // After hype animation, start the game
    setTimeout(() => {
      const { question: firstQ, index: firstQIndex } = getRandomQuestion([]);
      const firstPrompt = getFirstQuestionPrompt(nameInput.trim());
      const formatOptionsText = firstQ.options ? `\nOptions: ${firstQ.options.join(", ")}` : "";
      const fullPrompt = `${firstPrompt}\n\nQuestion: ${firstQ.text}${formatOptionsText}`;

      const initialMessages: Message[] = [
        { role: "user", content: fullPrompt },
      ];

      setGame((prev) => ({
        ...prev,
        phase: "playing",
        messages: [],
        currentQuestion: firstQ,
        askedQuestions: [firstQIndex],
        isTimerRunning: false, // Don't start timer until the first question finishes streaming
        timerSeconds: TIMER_DURATION,
      }));
      currentTimeLeft.current = TIMER_DURATION;

      // Stream the first question
      streamMessage(initialMessages, 1, 0, "question");
    }, 3000);
  };

  // ── Send a player answer ──────────────────────────────────────────
  const handleSend = () => {
    if (!input.trim() || game.isStreaming) return;

    stopSpeaking(); // Stop TTS when user sends answer

    const userMessage: Message = { role: "user", content: input.trim() };
    const updatedMessages = [...game.messages, userMessage];

    setGame((prev) => ({
      ...prev,
      messages: updatedMessages,
      isTimerRunning: false, // pause timer while evaluating
    }));
    setInput("");

    streamMessage(updatedMessages, game.round, game.score, "reaction");
  };



  // ── Time's up ─────────────────────────────────────────────────────
  const handleTimeUp = useCallback(() => {
    if (game.isStreaming) return;

    playTimeUpSound();
    stopSpeaking();

    setGame((prev) => ({
      ...prev,
      isTimerRunning: false,
      phase: "result",
      result: "lose",
    }));

  }, [game.isStreaming]);

  // ── Timer tick handler with sound ─────────────────────────────────
  const handleTick = useCallback(
    (s: number) => {
      currentTimeLeft.current = s;
      // Play tick sound for the last 5 seconds
      if (s <= 5 && s > 0) {
        playTickSound();
      }
    },
    []
  );

  // ── Handle Next Question ──────────────────────────────────────────
  const handleNextQuestion = () => {
    stopSpeaking();

    // Clear chat and ask next question
    const { question: nextQ, index: nextQIndex } = getRandomQuestion(game.askedQuestions);
    const nextPrompt = getNextQuestionPrompt(game.round, game.score);
    const formatOptionsText = nextQ.options ? `\nOptions: ${nextQ.options.join(", ")}` : "";
    const fullPrompt = `${nextPrompt}\n\nQuestion: ${nextQ.text}${formatOptionsText}`;

    setGame((prev) => ({
      ...prev,
      messages: [],
      currentQuestion: nextQ,
      askedQuestions: [...prev.askedQuestions, nextQIndex],
      isWaitingForNext: false,
    }));

    streamMessage([{ role: "user", content: fullPrompt }], game.round, game.score, "question");
  };

  // ── Reset ─────────────────────────────────────────────────────────
  const handleReset = () => {
    stopSpeaking();
    resetGame();
    setInput("");
    setNameInput("");
    currentTimeLeft.current = TIMER_DURATION;
  };



  // ────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────

  // WELCOME SCREEN
  if (game.phase === "welcome") {
    return (
      <div className="screen welcome-screen">
        <div className="welcome-card">
          <div className="welcome-logo">🧠💥</div>
          <h1 className="welcome-title">BOT TALK</h1>
          <p className="welcome-subtitle">Bot-n-Rool @ Arunya Fest 2026</p>
          <div className="welcome-rules">
            <div className="rule">🔥 Endless Mode</div>
            <div className="rule">⏱️ 60 Seconds Each</div>
            <div className="rule">🏆 8 Correct to Win</div>
          </div>
          <div className="welcome-input-group">
            <input
              type="text"
              placeholder="Enter your name, challenger..."
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleStartGame()}
              className="welcome-input"
              autoFocus
            />
            <button
              onClick={handleStartGame}
              disabled={!nameInput.trim()}
              className="welcome-button brutalist-button"
            >
              LET&apos;S GO! 🚀
            </button>
          </div>

          {/* TTS toggle */}
          <button
            onClick={() => setTtsEnabled((v) => !v)}
            className="tts-toggle"
            title={ttsEnabled ? "Disable voice" : "Enable voice"}
          >
            {ttsEnabled ? "🔊 Voice ON" : "🔇 Voice OFF"}
          </button>
        </div>
      </div>
    );
  }

  // HYPE SCREEN
  if (game.phase === "hype") {
    return (
      <div className="screen hype-screen">
        <div className="hype-content">
          <div className="hype-emoji">🔥</div>
          <h1 className="hype-title">GET READY</h1>
          <h2 className="hype-name">{game.playerName}!</h2>
          <p className="hype-text">The game is about to BEGIN...</p>
          <div className="hype-dots">
            <span className="dot dot-1">●</span>
            <span className="dot dot-2">●</span>
            <span className="dot dot-3">●</span>
          </div>
        </div>
      </div>
    );
  }

  // RESULT SCREEN
  if (game.phase === "result") {
    const isWin = game.result === "win";
    return (
      <div className={`screen result-screen ${isWin ? "win" : "lose"}`}>
        <div className="result-card">
          <div className="result-emoji">{isWin ? "🏆" : "😢"}</div>
          <h1 className="result-title">
            {isWin ? "YOU WIN!" : "GAME OVER"}
          </h1>
          <h2 className="result-name">{game.playerName}</h2>
          <div className="result-score">
            <span className="result-score-number">{game.score}</span>
            <span className="result-score-label">
              / 8 correct
            </span>
          </div>
          <p className="result-message">
            {isWin
              ? "🎉 Incredible! You're a BOT TALK champion!"
              : "So close! You'll get it next time, champion! 💪"}
          </p>
          <button onClick={handleReset} className="reset-button brutalist-button">
            PLAY AGAIN 🔄
          </button>
        </div>
      </div>
    );
  }

  // PLAYING SCREEN
  return (
    <div className="screen playing-screen">
      <GameBoard
        round={game.round}
        score={game.score}
        playerName={game.playerName}
      >
        {/* Timer */}
        <Timer
          durationSeconds={game.timerSeconds}
          isRunning={game.isTimerRunning}
          onTimeUp={handleTimeUp}
          onTick={handleTick}
        />

        {/* Chat area */}
        <div className="chat-area">
          {game.messages.map((msg, i) => (
            <ChatBubble
              key={i}
              role={msg.role}
              content={msg.content}
              isStreaming={
                game.isStreaming &&
                i === game.messages.length - 1 &&
                msg.role === "assistant"
              }
            />
          ))}
          <div ref={chatEndRef} />
        </div>


        {/* Input area */}
        <div className="chat-input-area">
          {game.isWaitingForNext ? (
            <button
              onClick={handleNextQuestion}
              className="send-button brutalist-button"
              style={{ width: "100%" }}
            >
              NEXT QUESTION ➡️
            </button>
          ) : (
            <>
              <input
                ref={inputRef}
                type="text"
                placeholder={
                  game.isStreaming ? "Buzzy is talking..." : "Type your answer..."
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                disabled={game.isStreaming}
                className="chat-input"
              />
              <button
                onClick={handleSend}
                disabled={game.isStreaming || !input.trim()}
                className="send-button brutalist-button"
              >
                Send 🎤
              </button>
            </>
          )}
        </div>
      </GameBoard>
    </div>
  );
}
