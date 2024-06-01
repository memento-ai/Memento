// Path: packages/postgres-db/src/mem.ts

import { CONV, CSUM, ConvExchangeMetaArgs, ConvSummaryMetaArgs, ConversationMetaArgs, DOC, DSUM, DocSummaryMetaArgs, DocumentMetaArgs, FRAG, FragmentMetaArgs, Mem, MetaArgs, SYN, SynopsisMetaArgs, XCHG, createMem } from '@memento-ai/types';
import { sql, type DatabasePool, type CommonQueryMethods, type QueryResult } from 'slonik';
import debug from 'debug';
import { zodParse } from '@memento-ai/utils';

const dlog = debug("postgres-db:mem");

export interface AddMemArgs {
    pool: DatabasePool,
    metaId: string,
    content: string,
    metaArgs: MetaArgs
}

export type ID = { id: string }

export async function insertMem(pool: CommonQueryMethods, mem: Mem) : Promise<void> {
    const embed_vector = JSON.stringify(mem.embed_vector);
    await pool.query(sql.unsafe`
        INSERT INTO mem (id, content, embed_vector, tokens)
        VALUES (${mem.id}, ${mem.content}, ${ embed_vector }, ${mem.tokens})
        ON CONFLICT (id) DO NOTHING;`)
}

export async function insertMeta(conn: CommonQueryMethods, memId: string, metaId: string, metaArgs: MetaArgs) : Promise<ID[]> {
    const { kind } = metaArgs;
    let results: QueryResult<any>;
    switch (kind) {
        case CONV: {
            const { role, source, priority, docid } = zodParse(ConversationMetaArgs, metaArgs);
            results = await conn.query(sql.unsafe`
                INSERT INTO meta (id, memid, kind, role, source, priority, docid)
                VALUES (${metaId}, ${memId}, ${metaArgs.kind}, ${role}, ${source}, ${priority ?? null}, ${docid ?? null})
                RETURNING id`);
            break;
        }
        case FRAG: {
            const { docId } = zodParse(FragmentMetaArgs, metaArgs);
            results = await conn.query(sql.unsafe`
                INSERT INTO meta (id, memid, kind, docId)
                VALUES (${metaId}, ${memId}, ${metaArgs.kind}, ${docId})
                RETURNING id`);
            break;
        }
        case DOC: {
            const { summaryId, source } = zodParse(DocumentMetaArgs, metaArgs);
            results = await conn.query(sql.unsafe`
                INSERT INTO meta (id, memid, kind, source, summaryid)
                VALUES (${metaId}, ${memId}, ${metaArgs.kind}, ${source}, ${summaryId})
                RETURNING id`);
            break;
        }
        case DSUM: {
            const { docId, source } = zodParse(DocSummaryMetaArgs, metaArgs);
            results = await conn.query(sql.unsafe`
                INSERT INTO meta (id, memid, kind, docId, source)
                VALUES (${metaId}, ${memId}, ${metaArgs.kind}, ${docId}, ${source})
                RETURNING id`);
            break;
        }
        case CSUM: {
            const { pinned, priority } = zodParse(ConvSummaryMetaArgs, metaArgs);
            results = await conn.query(sql.unsafe`
                INSERT INTO meta (id, memid, kind, pinned, priority)
                VALUES (${metaId}, ${memId}, ${metaArgs.kind}, ${pinned ?? null}, ${priority ?? null})
                ON CONFLICT (id) DO UPDATE SET
                    memid = EXCLUDED.memid,
                    kind = EXCLUDED.kind,
                    pinned = EXCLUDED.pinned,
                    priority = EXCLUDED.priority
                RETURNING id`);
            break;
        }
        case SYN: {
            const { kind } = zodParse(SynopsisMetaArgs, metaArgs);
            results = await conn.query(sql.unsafe`
                INSERT INTO meta (id, memid, kind)
                VALUES (${metaId}, ${memId}, ${kind})
                RETURNING id`);
            break;
        }
        case XCHG: {
            const { kind } = zodParse(ConvExchangeMetaArgs, metaArgs);
            results = await conn.query(sql.unsafe`
                INSERT INTO meta (id, memid, kind)
                VALUES (${metaId}, ${memId}, ${kind})
                RETURNING id`);
            break;
        }

        default:
            throw new Error(`Unsupported MemMetaData kind: ${kind}`);
    }
    const result = results.rows.map(row => ({ id: row.id }));
    dlog(result);
    return result;
}

// Add a Mem and Meta to the database
export async function addMemento(args: AddMemArgs): Promise<ID> {
    const { pool, metaId, content, metaArgs } = args;

    // A Mem is entirely determined from its content, so we only pass in the content to this function,
    // and then construct the Mem from the content.
    const mem: Mem = await createMem(content);

    const result = await pool.connect(async conn => {
        return await addMementoWithConn({ conn, mem, metaId, metaArgs });
    });

    return result;
}

export interface AddMemWithConnArgs {
    conn: CommonQueryMethods,
    mem: Mem,
    metaId: string,
    metaArgs: MetaArgs
}

// Add a Mem and Meta to the database using a connection for use within a transaction
export async function addMementoWithConn(args: AddMemWithConnArgs): Promise<ID> {
    const { conn, mem, metaId, metaArgs } = args;
    const memId = mem.id;
    try {
        await insertMem(conn, mem);
        await insertMeta(conn, memId, metaId, metaArgs)
    } catch (err) {
        console.error((err as Error).stack)
        throw err;
    }
    return { id: metaId };
}
