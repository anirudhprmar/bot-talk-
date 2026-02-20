export interface Question {
    text: string;
    answer: string;
    options?: string[]; // Optional for True/False
}

export const QUESTION_BANK: Question[] = [
    {
        text: "True or False: An AI developed by Google DeepMind called AlphaGo defeated the human world champion in the game of Go.",
        answer: "True",
        options: ["True", "False"],
    },
    {
        text: "Myth or Fact: AI systems can actually 'feel' emotions just like humans do.",
        answer: "Myth",
        options: ["Myth", "Fact"],
    },
    {
        text: "True or False: The term 'Artificial Intelligence' was first coined in the 1950s.",
        answer: "True",
        options: ["True", "False"],
    },
    {
        text: "Myth or Fact: AI will inevitably replace all human jobs within the next 10 years.",
        answer: "Myth",
        options: ["Myth", "Fact"],
    },
    {
        text: "True or False: Machine Learning is a subset of Artificial Intelligence.",
        answer: "True",
        options: ["True", "False"],
    },
    {
        text: "What does the 'GPT' in ChatGPT stand for: 'General Purpose Technology', 'Generative Pre-trained Transformer', or 'Guided Processing Tool'?",
        answer: "Generative Pre-trained Transformer",
        options: [
            "General Purpose Technology",
            "Generative Pre-trained Transformer",
            "Guided Processing Tool",
        ],
    },
    {
        text: "Myth or Fact: AI models like ChatGPT perfectly understand the meaning of words just like humans do.",
        answer: "Myth",
        options: ["Myth", "Fact"],
    },
    {
        text: "True or False: A Turing Test is used to determine whether a machine can exhibit human-like intelligence.",
        answer: "True",
        options: ["True", "False"],
    },
    {
        text: "Myth or Fact: If an AI gives an answer with absolute confidence, it means the answer is always 100% correct.",
        answer: "Myth",
        options: ["Myth", "Fact"],
    },
    {
        text: "True or False: Neural networks in AI are loosely inspired by the structure of the human brain.",
        answer: "True",
        options: ["True", "False"],
    }
];

export function getRandomQuestion(): Question {
    const randomIndex = Math.floor(Math.random() * QUESTION_BANK.length);
    return QUESTION_BANK[randomIndex];
}
