// Path: packages/types/src/mementoSchema.test.ts

import { expect, it, describe} from "bun:test";

import { CONV, DOC, DSUM, FRAG, SYN,  } from "./memKind";
import { Mem } from "./memSchema";
import { Message } from "./message";
import { USER, ASSISTANT,  } from "./role";
import {
    ConversationMetaArgs,
    DocSummaryMetaArgs,
    DocumentMetaArgs,
    FragmentMetaArgs,
    SynopsisMetaArgs,
} from "./metaArgs";

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
            docid: '123',
        });

        expect(fragmentMeta.kind).toBe('frag');
        expect(fragmentMeta.docid).toBe('123');
    });

    it('can parse a DocumentMetaArgs', () => {
        const documentMeta: DocumentMetaArgs = DocumentMetaArgs.parse({
            kind: DOC,
            docid: '123',
            summaryid: '456',
            source: 'testSource'
        });

        expect(documentMeta.kind).toBe('doc');
        expect(documentMeta.summaryid).toBe('456');
        expect(documentMeta.source).toBe('testSource');
    });

    it('can parse a DocSummaryMetaArgs', () => {
        const docSummaryMeta: DocSummaryMetaArgs = DocSummaryMetaArgs.parse({
            kind: DSUM,
            docid: '123',
            source: 'testSource',
            summaryid: '456',
        });

        expect(docSummaryMeta.kind).toBe('dsum');
        expect(docSummaryMeta.docid).toBe('123');
        expect(docSummaryMeta.source).toBe('testSource');
    });

    it('can parse a SynopsisMetaArgs', () => {
        const synopsisArgs: SynopsisMetaArgs = SynopsisMetaArgs.parse({
            kind: SYN,
        });

        expect(synopsisArgs.kind).toBe('syn');
    });

});
