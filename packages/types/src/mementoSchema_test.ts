import { expect, it, describe, beforeAll, afterAll, beforeEach, afterEach} from "bun:test";

import { USER, ASSISTANT, Message, Mem, SYS, CONV, CSUM, DOC, DSUM, FRAG } from "./mementoSchema";

import {
    SystemMetaArgs,
    ConversationMetaArgs,
    FragmentMetaArgs,
    DocumentMetaArgs,
    ConvSummaryMetaArgs,
    DocSummaryMetaArgs,
} from "./mementoSchema";


describe('Memento schema tests', () => {

    it ('can use USER and ASSISTANT', () => {
        expect(USER).toBe('user');
        expect(ASSISTANT).toBe('assistant');
    });

    it ('can parse a Message', () => {
        const message: Message = Message.parse({
            role: USER,
            content: 'Hello'
        });

        expect(message.role).toBe(USER);
        expect(message.content).toBe('Hello');
    });

    it ('can parse a Mem', () => {
        const mem: Mem = Mem.parse({
            id: '123',
            content: 'Hello',
            embed_vector: [1, 2, 3],
            tokens: 3
        });

        expect(mem.id).toBe('123');
        expect(mem.content).toBe('Hello');
        expect(mem.embed_vector).toEqual([1, 2, 3]);
        expect(mem.tokens).toBe(3);
    });

    it('can parse a SystemMetaArgs', () => {
        const systemMeta: SystemMetaArgs = SystemMetaArgs.parse({
            kind: SYS,
            priority: 1,
            pinned: true
        });

        expect(systemMeta.kind).toBe('sys');
        expect(systemMeta.priority).toBe(1);
        expect(systemMeta.pinned).toBe(true);
    });

    it('can parse a ConversationMetaArgs', () => {
        const conversationMeta: ConversationMetaArgs = ConversationMetaArgs.parse({
            kind: CONV,
            role: USER,
            source: 'conversation',
            priority: 0
        });

        expect(conversationMeta.kind).toBe('conv');
        expect(conversationMeta.role).toBe(USER);
        expect(conversationMeta.source).toBe('conversation');
        expect(conversationMeta.priority).toBe(0);
    });

    it('can parse a FragmentMetaArgs', () => {
        const fragmentMeta: FragmentMetaArgs = FragmentMetaArgs.parse({
            kind: FRAG,
            docId: '123',
        });

        expect(fragmentMeta.kind).toBe('frag');
        expect(fragmentMeta.docId).toBe('123');
    });

    it('can parse a DocumentMetaArgs', () => {
        const documentMeta: DocumentMetaArgs = DocumentMetaArgs.parse({
            kind: DOC,
            docId: '123',
            summaryId: '456',
            source: 'testSource'
        });

        expect(documentMeta.kind).toBe('doc');
        expect(documentMeta.docId).toBe('123');
        expect(documentMeta.summaryId).toBe('456');
        expect(documentMeta.source).toBe('testSource');
    });

    it('can parse a ConvSummaryMetaArgs', () => {
        const convSummaryMeta: ConvSummaryMetaArgs = ConvSummaryMetaArgs.parse({
            kind: CSUM,
            priority: 0,
            pinned: false
        });

        expect(convSummaryMeta.kind).toBe('csum');
        expect(convSummaryMeta.priority).toBe(0);
        expect(convSummaryMeta.pinned).toBe(false);
    });

    it('can parse a DocSummaryMetaArgs', () => {
        const docSummaryMeta: DocSummaryMetaArgs = DocSummaryMetaArgs.parse({
            kind: DSUM,
            docId: '123',
            source: 'testSource',
            summaryId: '456',
        });

        expect(docSummaryMeta.kind).toBe('dsum');
        expect(docSummaryMeta.docId).toBe('123');
        expect(docSummaryMeta.source).toBe('testSource');
        expect(docSummaryMeta.summaryId).toBe('456');
    });
});
