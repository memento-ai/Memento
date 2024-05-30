// Path: packages/conversation/src/ollama.test.ts

import { expect, test } from "bun:test";
import { USER } from "@memento-ai/types";
import { createConversation, type ConversationOptions } from "./factory";
import type { SendMessageArgs } from "./conversation";

const model = 'dolphin-phi';
const provider = 'ollama';
const options: ConversationOptions = { model, temperature: 0.0, max_response_tokens: 64, seed: 987 };

const prompt = "Answer all questions concisely, i.e give the shortest possible answer.";

test("Ollama nominal test", async () => {
    const conversation = createConversation(provider, options);

    const args: SendMessageArgs = {
        prompt,
        messages: [{
            role: USER,
            content: 'How many fingers are on one hand?'
        }]
    }
    const message = await conversation.sendMessage(args)

    let expected: string = '5 fingers.';
    expect(message.content).toBe(expected);
});

test("Ollama nominal test", async () => {
    const conversation = createConversation(provider, options);

    const args: SendMessageArgs = {
        prompt: prompt + " If the correct response is numeric, give the number without units.",
        messages: [{
            role: USER,
            content: 'How many fingers are on one hand?'
        }]
    }
    const message = await conversation.sendMessage(args)

    let expected: string = '5';
    expect(message.content).toBe(expected);
});
