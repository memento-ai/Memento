// Path: packages/memento-db/src/mementoDb.ts

import { addConvSummaryMem, addConversationMem, addDocAndSummary, addFragmentMem, addSynopsisMem } from './mementoDb-mems';
import { connectDatabase, connectReadonlyDatabase, get_csum_mementos, get_last_assistant_message, get_last_user_message, getConversation, type ID } from '@memento-ai/postgres-db';
import { registry, type FunctionRegistry } from "@memento-ai/function-calling";
import { searchMemsBySimilarity } from './searchMemsBySimilarity';
import { searchPinnedCsumMems } from './searchPinnedCsumMems';
import { getSynopses } from './getSynopses';
import { SimilarityResult } from './mementoDb-types';
import { type DatabasePool, type CommonQueryMethods, type Interceptor } from 'slonik';
import debug from 'debug';
import type { AddConvArgs, AddFragArgs, AddDocAndSummaryArgs, DocAndSummaryResult, AddConvSummaryArgs, AddSynopsisArgs, Context } from './mementoDb-types';
import { type Message, type Memento, ConvSummaryMetaData, SynopsisMetaData, ConvSummaryMemento } from '@memento-ai/types';
import { stripCommonIndent } from '@memento-ai/utils';

const dlog = debug("mementoDb");

export const INST_CSUM_CAT_CONVS = 'inst/csum-cat-convs';

export class MementoDb {
    name: string;
    private _pool: DatabasePool | null = null;
    private _readonlyPool: DatabasePool | null = null;
    private interceptors: Interceptor[];
    functionRegistry: FunctionRegistry;

    context() : Context {
        return {
            pool: this.pool,
            readonlyPool: this.readonlyPool,
        };
    }

    private constructor(name: string, interceptors: Interceptor[] = []) {
        dlog('Connecting MementoDb:', name);
        this.name = name;
        this.interceptors = interceptors;
        this.functionRegistry = registry;
    }

    async init() {
        this._pool = await connectDatabase(this.name, this.interceptors);
        this._readonlyPool = await connectReadonlyDatabase(this.name, this.interceptors);
    }

    static async create(name: string, interceptors: Interceptor[] = []): Promise<MementoDb> {
        const db = new MementoDb(name, interceptors);
        await db.init();
        return db;
    }

    async addCsumCategoryConventions() : Promise<void> {
        const { metaId, content, pinned, priority } = {
            metaId: INST_CSUM_CAT_CONVS,
            pinned: true,
            priority: 1000,
            content: stripCommonIndent(`
                <domain>/<topic>

                Domain: use 'cont', 'inst', or 'dev', defined as:
                    inst - Instructions (key prompts/directives)
                    dev - Software development
                    cont - Continuity (managing context/history)

                Topic: a descriptive keyword or phrase (e.g. 'csum-cat-convs')`)
        };

        await addConvSummaryMem(this.pool, { metaId, content, pinned, priority });
    }

    public get pool(): DatabasePool {
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

    async addConversationMem(args_: AddConvArgs): Promise<ID> {
        return addConversationMem(this.pool, args_);
    }

    async addFragmentMem(args_: AddFragArgs): Promise<ID> {
        return addFragmentMem(this.pool, args_);
    }

    async addDocAndSummary(args_: AddDocAndSummaryArgs): Promise<DocAndSummaryResult> {
        return addDocAndSummary(this.pool, args_);
    };

    async addConvSummaryMem(args_: AddConvSummaryArgs): Promise<ID> {
        return addConvSummaryMem(this.pool, args_);
    }

    async addSynopsisMem(args_: AddSynopsisArgs): Promise<ID> {
        return addSynopsisMem(this.pool, args_);
    }

    async getConversation(maxMessagePairs: number = 10): Promise<Message[]> {
        return await getConversation(this.pool, maxMessagePairs);
    }

    async searchMemsBySimilarity(userMessage: string, tokensLimit: number): Promise<SimilarityResult[]> {
        return searchMemsBySimilarity(this.pool, userMessage, tokensLimit);
    }

    async searchPinnedCsumMems(tokenLimit: number): Promise<ConvSummaryMemento[]> {
        return await searchPinnedCsumMems(this.pool, tokenLimit);
    }

    async get_csum_mementos(conn: CommonQueryMethods): Promise<ConvSummaryMetaData[]> {
        return get_csum_mementos(conn);
    }

    async getSynopses(tokenLimit: number): Promise<string[]> {
        return getSynopses(this.pool, tokenLimit);
    }

    async get_last_user_message(): Promise<Message> {
        return get_last_user_message(this.pool);
    }

    async get_last_assistant_message(): Promise<Message> {
        return get_last_assistant_message(this.pool);
    }
}
