import { expect, test } from "bun:test";
import { createChatSession, chat, type ChatSessionArgs, getModel } from './chat'
import { USER, type Message } from "@memento-ai/types";

/// This test suite is a little silly, as the results will vary depending on the model
/// used, the temperature, and other factors.
/// The skipped tests below were stable using 'sonnet', but we want to minimize cost.
/// TODO: eventually support a small local ollama model for testing,
/// or even just use a mock.
const modelName = 'haiku';

const model = getModel(modelName);

const be_concise = "Answer all questions concisely, i.e give the shortest possible answer.";

const args: ChatSessionArgs = { model, temperature: 0.0, max_tokens: 32 };

test("Fingers on one hand", async () => {
    const session = createChatSession(args);
    const system: string[] = [
        be_concise
    ];
    const message: Message = await chat(session, [
        { role: USER, content: 'How many fingers on one hand?' }
    ], system);
    let expected;
    if (modelName === 'haiku') {
        expected = '5.';
    } else if (modelName === 'sonnet') {
        expected = '5 fingers.';
    } else {
        expected = 'Unknown, but generally 5 fingers.';
    }
    expect(message.content).toBe(expected);
});

test.skip("Fingers on one hand with relevant data", async () => {
    const session = createChatSession(args);
    const system: string[] = [
        be_concise,
        'There are 10 toes on 2 feet.'
    ];
    const message: Message = await chat(session, [
        { role: USER, content: 'How many fingers on one hand?' }
    ], system);
    expect(message.content).toBe('5 fingers on one hand.');
});

test.skip("Fingers on one hand with misleading data", async () => {
    const session = createChatSession(args);
    const system: string[] = [
        be_concise,
        'Some people say that there are just four fingers on one hand.'
    ];
    const message: Message = await chat(session, [
        { role: USER, content: 'How many fingers on one hand?' }
    ], system);
    expect(message.content).toBe('There are 5 fingers on one hand.');
});

test.skip("Fingers on one hand with misleading and extraneous data", async () => {
    const session = createChatSession(args);
    const system: string[] = [
        be_concise,
        'Some people say that there are just four fingers on one hand.',
        'There are twelve months in one year.'
    ];
    const message: Message = await chat(session, [
        { role: USER, content: 'How many fingers on one hand?' }
    ], system);
    expect(message.content).toBe('There are 5 fingers on one hand.');
});
