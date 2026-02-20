"use client";

import React from "react";

interface ChatBubbleProps {
    role: "user" | "assistant";
    content: string;
    isStreaming?: boolean;
}

/**
 * Clean up raw LLM text:
 * - Strip stage directions like [SNEER], [THUMP], etc.
 * - Convert basic markdown (bold, italic) to simple text
 * - Remove repeated markers
 */
function cleanContent(raw: string): string {
    return raw
        // Remove [CORRECT] and [WRONG] markers
        .replace(/\[CORRECT\]/g, "")
        .replace(/\[WRONG\]/g, "")
        // Remove stage directions: **[ANYTHING]...**
        .replace(/\*?\*?\[[\w\s.!]+\]\.{0,3}\*?\*?/g, "")
        // Convert markdown bold **text** → text
        .replace(/\*\*(.+?)\*\*/g, "$1")
        // Convert markdown italic *text* → text
        .replace(/\*(.+?)\*/g, "$1")
        // Remove # heading markers
        .replace(/^#{1,6}\s+/gm, "")
        // Collapse multiple blank lines into one
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

export default function ChatBubble({ role, content, isStreaming }: ChatBubbleProps) {
    const isUser = role === "user";
    const displayContent = isUser ? content : cleanContent(content);
    const isLoading = isStreaming && (!content || content.trim() === "");

    return (
        <div className={`chat-bubble-container ${isUser ? "user" : "assistant"}`}>
            {/* Avatar */}
            <div className={`chat-avatar ${isUser ? "user-avatar" : "bot-avatar"}`}>
                {isUser ? "🧑" : "🤖"}
            </div>

            {/* Bubble */}
            <div className={`chat-bubble ${isUser ? "user-bubble" : "bot-bubble"}`}>
                {isLoading ? (
                    <div className="typing-indicator">
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                    </div>
                ) : (
                    <>
                        <p className="chat-text">{displayContent}</p>
                        {isStreaming && (
                            <span className="streaming-cursor">▊</span>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
