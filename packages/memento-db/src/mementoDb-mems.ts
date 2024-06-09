// Path: packages/memento-db/src/mementoDb-mems.ts

import { addMemento } from '@memento-ai/postgres-db';
import { CONV, DOC, DSUM, FRAG, RES, SYN } from '@memento-ai/types';
import { ConversationMetaArgs, DocumentMetaArgs, DocSummaryMetaArgs, FragmentMetaArgs, ResolutionMetaArgs, SynopsisMetaArgs } from '@memento-ai/types';
import { nanoid } from 'nanoid';
import { sql } from 'slonik';
import type  { DatabasePool } from 'slonik';
import { zodParse } from '@memento-ai/utils';
import debug from 'debug';
import type { AddConvArgs, AddDocAndSummaryArgs, DocAndSummaryResult, AddFragArgs, AddResolutionArgs, AddSynopsisArgs } from './mementoDb-types';
import type { ID } from '@memento-ai/postgres-db';
import type { LinkExchangeArgs } from './mementoDb';

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

export async function addDocAndSummary(pool: DatabasePool, args_: AddDocAndSummaryArgs): Promise<DocAndSummaryResult> {
    const { content, source, summary } = args_;
    const docid = nanoid();
    const summaryid = nanoid();
    await addMemento({ pool: pool, metaId: docid, content, metaArgs: zodParse(DocumentMetaArgs, { kind: DOC, docid, source, summaryid }) });
    await addMemento({ pool: pool, metaId: summaryid, content: summary, metaArgs: zodParse(DocSummaryMetaArgs, { kind: DSUM, docid, summaryid, source }) });
    return { docid, summaryid };
};

export async function addResolutionMem(pool: DatabasePool, args_: AddResolutionArgs): Promise<ID> {
    const { content } = args_;
    const metaArgs = zodParse(ResolutionMetaArgs, {
        kind: RES,
    });
    const metaId = nanoid();
    return await addMemento({ pool, metaId, content, metaArgs });
}

export async function addSynopsisMem(pool: DatabasePool, args_: AddSynopsisArgs): Promise<ID> {
    const { content } = args_;
    const metaArgs = zodParse(SynopsisMetaArgs, {
        kind: SYN,
    });
    const metaId = nanoid();
    return await addMemento({ pool, metaId, content, metaArgs });
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
