// Path: packages/memento-db/src/mementoDb-mems.ts

import { addMem, type ID } from '@memento-ai/postgres-db';
import { ConversationMetaArgs, CONV, FragmentMetaArgs, FRAG, DocumentMetaArgs, DOC, DocSummaryMetaArgs, DSUM, ConvSummaryMetaArgs, CSUM, SynopsisMemento, SYN, SynopsisMetaArgs } from '@memento-ai/types';
import { nanoid } from 'nanoid';
import { type AddConvArgs, type AddFragArgs, type AddDocAndSummaryArgs, type DocAndSummaryResult, type AddConvSummaryArgs, type AddSynopsisArgs } from './mementoDb-types';
import debug from 'debug';
import type { DatabasePool } from 'slonik';
import { zodParse } from '@memento-ai/utils';

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
    return await addMem({ pool: pool, metaId: nanoid(), content, metaArgs: args });
}

export async function addFragmentMem(pool: DatabasePool, args_: AddFragArgs): Promise<ID> {
    const { content, docId } = args_;
    const args = zodParse(FragmentMetaArgs, {
        kind: FRAG,
        docId
    });
    return await addMem({ pool: pool, metaId: nanoid(), content, metaArgs: args });
}

/// addDocAndSummary: uses a transation to add both a 'doc' and a 'dsum'.
/// This method trusts that `summary` is a valid summary of `content`.
export async function addDocAndSummary(pool: DatabasePool, args_: AddDocAndSummaryArgs): Promise<DocAndSummaryResult> {
    const { content, source, summary } = args_;
    const docId = nanoid();
    const summaryId = nanoid();
    await addMem({ pool: pool, metaId: docId, content, metaArgs: zodParse(DocumentMetaArgs, { kind: DOC, docId, source, summaryId }) });
    await addMem({ pool: pool, metaId: summaryId, content: summary, metaArgs: zodParse(DocSummaryMetaArgs, { kind: DSUM, docId, summaryId, source }) });
    return { docId, summaryId };
};

export async function addConvSummaryMem(pool: DatabasePool, args_: AddConvSummaryArgs): Promise<ID> {
    const { metaId, content, pinned, priority } = args_;
    const _metaArgs: ConvSummaryMetaArgs = {
        kind: CSUM,
        metaId,
        pinned,
        priority,
    };
    const metaArgs = zodParse(ConvSummaryMetaArgs, _metaArgs);
    return await addMem({ pool, metaId, content, metaArgs });
}

export async function addSynopsisMem(pool: DatabasePool, args_: AddSynopsisArgs): Promise<ID> {
    const { content } = args_;
    const metaArgs = zodParse(SynopsisMetaArgs, {
        kind: SYN,
    });
    const metaId = nanoid();
    return await addMem({ pool, metaId, content, metaArgs });
}
