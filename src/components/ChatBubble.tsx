"use client";

import React from "react";
import ReactMarkdown from "react-markdown";

interface ChatBubbleProps {
    role: "user" | "assistant";
    content: string;
    isStreaming?: boolean;
}

/**
 * Clean up raw LLM text:
 * - Strip stage directions like [SNEER], [THUMP], etc.
 * - Remove repeated markers
 * (Markdown formatting is now preserved for ReactMarkdown)
 */
function cleanContent(raw: string): string {
    return raw
        // Remove [CORRECT] and [WRONG] markers
        .replace(/\[CORRECT\]/gi, "")
        .replace(/\[WRONG\]/gi, "")
        // Remove stage directions: **[ANYTHING]...**
        .replace(/\*?\*?\[[\w\s.!]+\]\.{0,3}\*?\*?/g, "")
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
                        {isUser ? (
                            <p className="chat-text">{displayContent}</p>
                        ) : (
                            <div className="chat-text markdown-body">
                                <ReactMarkdown>{displayContent}</ReactMarkdown>
                            </div>
                        )}
                        {isStreaming && (
                            <span className="streaming-cursor">▊</span>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
