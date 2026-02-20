import { NextRequest } from "next/server";
import { ChatOllama } from "@langchain/ollama";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { buildSystemPrompt } from "@/lib/prompts";

export const runtime = "nodejs";

// Detect if the model is stuck in a repetitive loop
function isRepeating(text: string): boolean {
    if (text.length < 60) return false;

    // Check if the last 40 chars repeat a short pattern
    const tail = text.slice(-80);

    // Pattern: same 5-20 char sequence repeated 3+ times
    for (let len = 3; len <= 25; len++) {
        const pattern = tail.slice(-len);
        let count = 0;
        let pos = tail.length - len;
        while (pos >= 0 && tail.slice(pos, pos + len) === pattern) {
            count++;
            pos -= len;
        }
        if (count >= 3) return true;
    }

    // Check for stage direction spam: [WORD] appearing 3+ times
    const bracketMatches = text.match(/\*?\*?\[[\w\s.!]+\]\*?\*?/g);
    if (bracketMatches && bracketMatches.length >= 3) {
        // Check if latest ones are repetitive
        const last5 = bracketMatches.slice(-5);
        const unique = new Set(last5.map(s => s.replace(/\*/g, '').toLowerCase()));
        if (unique.size <= 2 && last5.length >= 3) return true;
    }

    return false;
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    const {
        messages,
        playerName = "Player",
        round = 1,
        score = 0,
        timeLeft = 30,
    } = body;

    const model = new ChatOllama({
        model: "qwen3:1.7b",
        baseUrl: "http://localhost:11434",
        temperature: 0.7,
        repeatPenalty: 1.5,
        numPredict: 400,
    });

    const systemPrompt = buildSystemPrompt(playerName, round, score, timeLeft);

    // Only send the last 6 messages to prevent context confusion
    const trimmedMessages = messages.slice(-6);

    // Build LangChain prompt using LCEL
    const prompt = ChatPromptTemplate.fromMessages([
        ["system", systemPrompt],
        ...trimmedMessages.map((msg: { role: string; content: string }) =>
            [msg.role === "user" ? "human" : "ai", msg.content] as const
        ),
    ]);

    // Create parsing chain
    const chain = prompt.pipe(model).pipe(new StringOutputParser());

    // Create a streaming response using SSE
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            let closed = false;

            function safeEnqueue(chunk: Uint8Array) {
                if (closed) return;
                try {
                    controller.enqueue(chunk);
                } catch {
                    closed = true;
                }
            }

            function safeClose() {
                if (closed) return;
                try {
                    controller.close();
                } catch {
                    // already closed
                }
                closed = true;
            }

            try {
                const streamResponse = await chain.stream({});
                let fullContent = "";
                let markerFoundAt = -1;
                let inThinkBlock = false;

                for await (const chunk of streamResponse) {
                    if (closed) break;
                    let content = chunk || "";
                    if (!content) continue;

                    // Filter out <think>...</think> blocks from qwen3
                    if (content.includes("<think>")) inThinkBlock = true;
                    if (inThinkBlock) {
                        if (content.includes("</think>")) {
                            inThinkBlock = false;
                            content = content.split("</think>").pop() || "";
                        } else {
                            continue;
                        }
                        if (!content) continue;
                    }

                    fullContent += content;

                    // Detect the first [CORRECT] or [WRONG] marker
                    if (markerFoundAt < 0) {
                        if (fullContent.includes("[CORRECT]") || fullContent.includes("[WRONG]")) {
                            markerFoundAt = fullContent.length;
                        }
                    }

                    // Detect repetitive loops and force-stop
                    if (isRepeating(fullContent)) {
                        break;
                    }

                    const data = JSON.stringify({ content });
                    safeEnqueue(encoder.encode(`data: ${data}\n\n`));

                    // After marker + 400 chars buffer for explanation and next question, force stop
                    if (markerFoundAt >= 0 && fullContent.length - markerFoundAt > 400) {
                        break;
                    }
                }

                safeEnqueue(encoder.encode("data: [DONE]\n\n"));
                safeClose();
            } catch (error) {
                if (closed) return;
                console.error("Ollama streaming error:", error);
                const errMsg = JSON.stringify({
                    error: "Failed to connect to Ollama. Make sure it is running on localhost:11434",
                });
                safeEnqueue(encoder.encode(`data: ${errMsg}\n\n`));
                safeEnqueue(encoder.encode("data: [DONE]\n\n"));
                safeClose();
            }
        },
        cancel() {
            // Client disconnected
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
        },
    });
}