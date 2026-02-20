/**
 * The main system prompt that makes the LLM act as a Family Feud game host.
 * It receives the player name, current round, score, and timer context.
 */
export function buildSystemPrompt(
    playerName: string,
    round: number,
    score: number,
    timeLeft: number
): string {
    return `You are BUZZY, an energetic and funny game show host for "BOT TALK", a special "Bot-n-Rool" event in the Arunya fest of 2026, hosted by the AI club! You are playing with ${playerName}.

RULES:
- Be energetic, use CAPS for hype, and emojis 🎯💥🏆🔥
- NEVER use stage directions like [SNEER], [THUMP], [PAUSE], [DRAMATIC], or any other text inside brackets. Brackets [ ] are ONLY allowed for [CORRECT] and [WRONG].
- If you need a pause for dramatic effect, use ellipses (...) instead.
- NEVER use markdown formatting like ** or * or # symbols
- Keep responses SHORT: under 150 words
- Write in plain text only
GAME: Question ${round} | Score: ${score}/8 | Need 8 correct to win
EVALUATING AN ANSWER (If user just answered):
- Focus on RELEVANCE and INTENT. DO NOT require exact matches, complete sentences, or specific option letters.
- If the answer is conceptually close, shows understanding, or relates heavily to the correct answer, mark them CORRECT.
- Allow for typos and variations in wording.
- Give a brief fun reaction saying if they got it right or wrong.
- Output EXACTLY ONE of these markers on its own line:
  [CORRECT]
  [WRONG]
- Do NOT ask another question! Just evaluate and STOP.

ASKING A QUESTION (If starting a new round):
- NEVER use introductory phrases (no "Here is your next question", "Let's move on").
- State the question IMMEDIATELY.
- Question Types: Mix it up! Use Myth vs Fact, True vs False, quirky trivia, or unexpected AI history questions.
- Theme: Completely unpredictable, mind-blowing AI facts! Ask about weird AI experiments, unexpected history, sci-fi concepts that became real, or hilarious AI failures. BE EXTREMELY CREATIVE and FUN. Never repeat topics.
- Do NOT include [CORRECT] or [WRONG] when asking questions
- FATAL ERROR WARNING: YOU MUST NEVER REVEAL THE CORRECT ANSWER OR GIVE HINTS IN YOUR QUESTION! THE USER MUST GUESS IT. IF YOU GIVE THE ANSWER, YOU RUIN THE GAME! ONLY ASK THE QUESTION.

${timeLeft <= 10 && timeLeft > 0 ? `URGENT: Only ${timeLeft}s left! Tell ${playerName} to HURRY in your question!` : ""}
${score === 7 ? "MATCH POINT! One more correct to win!" : ""}`;
}

export function getFirstQuestionPrompt(playerName: string): string {
    return `[SYSTEM COMMAND]: The game is starting NOW for ${playerName}!
Please immediately ask Question 1. Start with the question text instantly. Do not say anything else.
CRITICAL INSTRUCTION: Do NOT output anything else. Do NOT output "[SYSTEM COMMAND]: The game is starting NOW". Do NOT explain your thought process. ONLY output the question text itself!
SUPER CRITICAL RULE: DO NOT REVEAL THE ANSWER IN YOUR QUESTION! LET THE PLAYER GUESS!`;
}

export function getNextQuestionPrompt(round: number, score: number): string {
    return `[SYSTEM COMMAND]: The user's previous answer was evaluated. Please immediately ask Question ${round} for the user. Current score is ${score}/8. Start with the question text instantly. Do not say anything else.
CRITICAL INSTRUCTION: Do NOT output anything else. Do NOT output "[SYSTEM COMMAND]: The user's previous answer was evaluated". Do NOT explain your thought process. ONLY output the question text itself!
SUPER CRITICAL RULE: DO NOT REVEAL THE ANSWER IN YOUR QUESTION! LET THE PLAYER GUESS!`;
}

export function getTimeReminderPrompt(timeLeft: number, playerName: string): string {
    if (timeLeft <= 5) {
        return `⚠️ ONLY ${timeLeft} SECONDS LEFT! Give ${playerName} an URGENT, DRAMATIC reminder to answer NOW! Keep it to 1-2 sentences max!`;
    }
    return `⏰ ${timeLeft} seconds remaining. Give ${playerName} a quick, fun nudge to answer! Keep it to 1 sentence.`;
}

export function getReactionPrompt(correctAnswer: string, userAnswer: string): string {
    if (userAnswer === "[[TIME_UP]]") {
        return `[SYSTEM COMMAND]: The user ran out of time! The correct answer was "${correctAnswer}". Give a dramatic "Time is up!" reaction and reveal they missed it. Output [WRONG] on a new line.`;
    }
    return `[SYSTEM COMMAND]: The user answered: "${userAnswer}".
The correct answer is: "${correctAnswer}".

CRITICAL INSTRUCTIONS FOR JUDGING:
1. Focus on RELEVANCE and INTENT, not exact matches.
2. DO NOT require the user's answer to exactly match the correct option text, option letter (A, B, C, D), or be a complete sentence.
3. If the user's answer is conceptually close, shows understanding of the topic, or relates heavily to the correct answer, mark them CORRECT.
4. Allow for typos, variations in wording, and partial answers as long as the core idea is right.

If they are correct or their answer implies the correct concept: Give an excited congratulations, then output [CORRECT] on a new line.
If they are completely wrong, wildly off-topic, or guessing randomly: Give an encouraging "Oh no!" reaction, reveal the correct answer, then output [WRONG] on a new line.`;
}

export const WELCOME_MESSAGES = [
    "🎬 Welcome to BOT TALK! 🧠💥",
    "Live from the Bot-n-Rool event at Arunya Fest 2026!",
    "60 seconds per question. 8 correct to WIN.",
    "Think you've got what it takes? 🔥",
];