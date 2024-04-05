import {
    type Message, type Role,
    CONV, DOC, FRAG, SYS, CSUM, DSUM,
    ConversationMetaArgs, DocumentMetaArgs, FragmentMetaArgs, SystemMetaArgs, DocSummaryMetaArgs, ConvSummaryMetaArgs,
    } from '@memento-ai/types';
import debug from 'debug';
import { prompts } from './systemPrompts';
import { embedding } from '@memento-ai/embedding';
import { z } from 'zod';
import { registry, type FunctionRegistry } from "@memento-ai/function-calling";
import { nanoid } from 'nanoid';
import { sql, type DatabasePool, type QueryResult, type QueryResultRow } from 'slonik';
import { addMem, connectDatabase, connectReadonlyDatabase, getConversation, getSystemPrompts, type ID } from '@memento-ai/postgres-db';
import pgvector from 'pgvector';


export const Context = z.object({
    readonlyPool: z.any()
});
export type Context = z.infer<typeof Context>;

const dlog = debug("mementoDb");

export type AddResponse = {
    error: string;
}

// The Add*Args types below are closely related to the *MemArgs types defined in mementoSchema,
// and possibly should be the same type.

export type AddConvArgs = {
    content: string;
    role: Role;
    priority?: number;
}

export type AddSysArgs = {
    content: string;
    priority: number;
}

export type AddFragArgs = {
    content: string;
    docId: string;
}

export type AddDocAndSummaryArgs = {
    source: string;
    content: string;
    summary: string
}

export type AddConvSummaryArgs = {
    content: string;
    pinned?: boolean;
    priority?: number;
}

export const SimilarityResult = z.object({
    id: z.string(),
    content: z.string(),
    source: z.string(),
    created_at: z.number(),
    tokens: z.number(),
    similarity: z.number(),
});
export type SimilarityResult = z.TypeOf<typeof SimilarityResult>;

export interface DocAndSummaryResult {
    docId: string;
    summaryId: string;
}

export class MementoDb
{
    name: string;
    private _pool: DatabasePool | null = null;
    private _readonlyPool: DatabasePool | null = null;
    functionRegistry: FunctionRegistry;

    private constructor(name: string) {
        dlog('Connecting MementoDb:', name)
        this.name = name;
        this.functionRegistry = registry;
    }

    async init() {
        this._pool = await connectDatabase(this.name);
        this._readonlyPool = await connectReadonlyDatabase(this.name);
    }

    static async create(name: string) : Promise<MementoDb> {
        const db = new MementoDb(name);
        await db.init();
        return db;
    }

    public get pool() : DatabasePool {
        if (!this._pool) {
            throw new Error('Pool is already closed');
        }
        return this._pool;
    }

    public get readonlyPool() {
        if (!this._readonlyPool) {
            throw new Error('Readonly pool is already closed');
        }
        return this._readonlyPool;
    }

    async close() {
        if (!this._pool) {
            dlog('Pool is already closed:', this.name);
            throw new Error('Pool is already closed');
        }
        if (!this._readonlyPool) {
            dlog('Readonly pool is aready closed:', this.name);
            throw new Error('Readonly pool is already closed');
        }

        dlog('Closing readonly connection to database:', this.name);
        await this._readonlyPool.end();
        this._readonlyPool = null;

        dlog('Closing readwrite connection to database:', this.name);
        await this._pool.end();
        this._pool = null;
        dlog('Database closed:', this.name);
    }

    async addConversationMem(args_: AddConvArgs) : Promise<ID> {
        const {content, role, priority} = args_;
        const args = ConversationMetaArgs.parse({
            kind: CONV,
            role,
            source: 'conversation',
            priority
        });
        dlog('Adding conversation mem:', args);
        return await addMem({pool: this.pool, metaId: nanoid(), content, metaArgs: args});
    }

    async addSystemMem(args_: AddSysArgs) : Promise<ID> {
        const { content, priority } = args_;
        const args = SystemMetaArgs.parse({
            kind: SYS,
            pinned: true,
            priority,
        })
        return await addMem({pool: this.pool, metaId: nanoid(), content, metaArgs: args});
    }

    async addFragmentMem(args_: AddFragArgs) : Promise<ID> {
        const { content, docId } = args_;
        const args = FragmentMetaArgs.parse({
            kind: FRAG,
            docId
        })
        return await addMem({pool: this.pool, metaId: nanoid(), content, metaArgs: args});
    }

    /// addDocAndSummary: uses a transation to add both a 'doc' and a 'dsum'.
    /// This method trusts that `summary` is a valid summary of `content`.
    async addDocAndSummary(args_: AddDocAndSummaryArgs) : Promise<DocAndSummaryResult> {
        const { content, source, summary } = args_;
        const docId = nanoid();
        const summaryId = nanoid();
        await addMem({pool: this.pool, metaId: docId, content, metaArgs: DocumentMetaArgs.parse({kind: DOC, docId, source, summaryId})});
        await addMem({pool: this.pool, metaId: summaryId, content: summary, metaArgs: DocSummaryMetaArgs.parse({kind: DSUM, docId, summaryId, source})});
        return { docId, summaryId };
    };

    async addConvSummaryMem(args_: AddConvSummaryArgs) : Promise<ID> {
        const { content, pinned, priority } = args_;
        const args = ConvSummaryMetaArgs.parse({
            kind: CSUM,
            pinned,
            priority,
        });
        return await addMem({pool: this.pool, metaId: nanoid(), content, metaArgs: args});
    }

    private async loadSystemPrompts() {
        // TODO: batch insert all at once?
        for (const prompt of prompts) {
            await this.addSystemMem(prompt);
        }
    }

    async getSystemPrompts() : Promise<string[]> {
        let prompts = await getSystemPrompts(this.pool);
        if (prompts.length === 0) {
            await this.loadSystemPrompts();
            prompts = await getSystemPrompts(this.pool);
        }
        return prompts;
    }

    async getConversation() : Promise<Message[]> {
        return await getConversation(this.pool);
    }

    async searchMemsBySimilarity(userMessage: string, topN: number): Promise<SimilarityResult[]> {
        const queryEmbedding = await embedding.generateOne(userMessage);
        const queryVector = pgvector.toSql(queryEmbedding);

        return await this.pool.connect(async (conn) => {
            const result: QueryResult<QueryResultRow> = await conn.query(sql.unsafe`
                SELECT
                m.id,
                m.content,
                mt.kind,
                mt.source,
                mt.created_at,
                m.tokens,
                m.embed_vector <=> ${queryVector} AS similarity
                FROM
                mem m
                JOIN
                meta mt ON m.id = mt.memid
                WHERE
                mt.kind IN (${DOC}, ${DSUM}, ${CONV})
                ORDER BY
                similarity ASC
                LIMIT ${topN}
            `);

            return result.rows.map((row) => {
                try {
                    const similarity: SimilarityResult = SimilarityResult.parse(row);
                    return similarity;
                } catch (error) {
                    console.error('Error parsing similarity result:', error);
                    console.error(row);
                    throw error;
                }
            });
        });
    }
}
