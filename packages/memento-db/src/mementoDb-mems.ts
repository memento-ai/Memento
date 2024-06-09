// Path: packages/memento-db/src/mementoDb-mems.ts

import { addMemento, addMementoWithConn, type ID } from '@memento-ai/postgres-db';
import { ConversationMetaArgs, CONV, FragmentMetaArgs, FRAG, DocumentMetaArgs, DOC, DocSummaryMetaArgs, DSUM, SYN, SynopsisMetaArgs, XCHG, ConvExchangeMetaArgs, createMem, Mem, USER, ASSISTANT } from '@memento-ai/types';
import { nanoid } from 'nanoid';
import { type AddConvArgs, type AddFragArgs, type AddDocAndSummaryArgs, type DocAndSummaryResult, type AddSynopsisArgs, type AddConvExchangeArgs } from './mementoDb-types';
import debug from 'debug';
import { sql, type DatabasePool } from 'slonik';
import { zodParse } from '@memento-ai/utils';
import type { LinkExchangeArgs } from '..';

const dlog = debug("mementoDb:mems");

export async function addConversationMem(pool: DatabasePool, args_: AddConvArgs): Promise<ID> {
    const { content, role, priority } = args_;
    const args = zodParse(ConversationMetaArgs, {
        kind: CONV,
        role,
        source: 'conversation',
        priority
    });
    dlog('Adding conversation mem:', args);
    return await addMemento({ pool: pool, metaId: nanoid(), content, metaArgs: args });
}

export async function addFragmentMem(pool: DatabasePool, args_: AddFragArgs): Promise<ID> {
    const { content, docid } = args_;
    const args = zodParse(FragmentMetaArgs, {
        kind: FRAG,
        docid
    });
    return await addMemento({ pool: pool, metaId: nanoid(), content, metaArgs: args });
}

/// addDocAndSummary: uses a transation to add both a 'doc' and a 'dsum'.
/// This method trusts that `summary` is a valid summary of `content`.
export async function addDocAndSummary(pool: DatabasePool, args_: AddDocAndSummaryArgs): Promise<DocAndSummaryResult> {
    const { content, source, summary } = args_;
    const docid = nanoid();
    const summaryid = nanoid();
    await addMemento({ pool: pool, metaId: docid, content, metaArgs: zodParse(DocumentMetaArgs, { kind: DOC, docid, source, summaryid }) });
    await addMemento({ pool: pool, metaId: summaryid, content: summary, metaArgs: zodParse(DocSummaryMetaArgs, { kind: DSUM, docid, summaryid, source }) });
    return { docid, summaryid };
};

export async function addSynopsisMem(pool: DatabasePool, args_: AddSynopsisArgs): Promise<ID> {
    const { content } = args_;
    const metaArgs = zodParse(SynopsisMetaArgs, {
        kind: SYN,
    });
    const metaId = nanoid();
    return await addMemento({ pool, metaId, content, metaArgs });
}

// This adds multiple mementos in one transaction:
// - a conversation exchange memento
// - a conv memento for the user message
// - a conv memento for the assistant message
export async function addConvExchangeMementos(pool: DatabasePool, args_: AddConvExchangeArgs): Promise<ID> {
    const { userContent, asstContent } = args_;

    const result = await pool.connect(async conn => {
        const userMem: Mem = await createMem(userContent);
        const asstMem: Mem = await createMem(asstContent);
        const xchgMem: Mem = await createMem(`# User:\n${userContent.trim()}\n\n---\n\n# Assistant:\n${asstContent.trim()}\n`);

        const userMetaId = nanoid();
        const asstMetaId = nanoid();
        const xchgMetaId = nanoid();

        const userMetaArgs = zodParse(ConversationMetaArgs, {
            kind: CONV,
            role: USER,
            source: 'conversation',
            docid: xchgMetaId,
        });

        const asstMetaArgs = zodParse(ConversationMetaArgs, {
            kind: CONV,
            role: ASSISTANT,
            source: 'conversation',
            docid: xchgMetaId,
        });

        const xchgMetaArgs = zodParse(ConvExchangeMetaArgs, {
            kind: XCHG,
        });

        const userID = await addMementoWithConn({ conn, mem: userMem, metaId: userMetaId, metaArgs: userMetaArgs });
        const asstID = await addMementoWithConn({ conn, mem: asstMem, metaId: asstMetaId, metaArgs: asstMetaArgs });
        const xchgID = await addMementoWithConn({ conn, mem: xchgMem, metaId: xchgMetaId, metaArgs: xchgMetaArgs });

        dlog('Added conversation exchange mementos:', { userID, asstID, xchgID });

        return xchgID;
    });

    return result;

}

export async function linkExchangeSynopsis(pool: DatabasePool, { xchg_id, synopsis_id }: LinkExchangeArgs): Promise<void> {
    await pool.transaction(async conn => {
        // Update the conversation exchange memento, setting summaryid to the synopsis_id
        await conn.query(sql.unsafe`
            UPDATE meta
            SET summaryid = ${synopsis_id}
            WHERE id = ${xchg_id};`);

        // Update the synopsis memento, setting docid to the id of the synopsis to the id of the conversation exchange
        await conn.query(sql.unsafe`
            UPDATE meta
            SET docid = ${xchg_id}
            WHERE id = ${synopsis_id};`);
    });
}
