// Path: packages/memento-db/src/mementoDb.ts

import type { Config } from '@memento-ai/config'
import {
    connectDatabase,
    connectReadonlyDatabase,
    getConversation,
    get_last_assistant_message,
    get_last_user_message,
    type ID,
} from '@memento-ai/postgres-db'
import type { Message } from '@memento-ai/types'
import debug from 'debug'
import type { DatabasePool, Interceptor } from 'slonik'
import { sql } from 'slonik'
import { z } from 'zod'
import { getSynopses, type GetSynopsesArgs } from './getSynopses'
import { addConvExchangeMementos } from './mementoDb-addConvXchg'
import {
    addConversationMem,
    addDocAndSummary,
    addFragmentMem,
    addResolutionMem,
    addSynopsisMem,
    linkExchangeSynopsis,
} from './mementoDb-mems'
import type {
    AddConvArgs,
    AddConvExchangeArgs,
    AddDocAndSummaryArgs,
    AddFragArgs,
    AddSynopsisArgs,
    Context,
    DocAndSummaryResult,
} from './mementoDb-types'

const dlog = debug('mementoDb')

export type LinkExchangeArgs = {
    xchg_id: string
    synopsis_id: string
}

export const Resolution = z.object({
    content: z.string(),
})
export type Resolution = z.infer<typeof Resolution>

export class MementoDb {
    name: string
    private _pool: DatabasePool | null = null
    private _readonlyPool: DatabasePool | null = null
    private interceptors: Interceptor[]

    context(): Context {
        return {
            pool: this.pool,
            readonlyPool: this.readonlyPool,
        }
    }

    private constructor(name: string, interceptors: Interceptor[] = []) {
        dlog('Connecting MementoDb:', name)
        this.name = name
        this.interceptors = interceptors
    }

    async init() {
        this._pool = await connectDatabase(this.name, this.interceptors)
        this._readonlyPool = await connectReadonlyDatabase(this.name, this.interceptors)
    }

    static async connect(name: string, interceptors: Interceptor[] = []): Promise<MementoDb> {
        const db = new MementoDb(name, interceptors)
        await db.init()
        return db
    }

    public get pool(): DatabasePool {
        if (!this._pool) {
            throw new Error('Pool is already closed')
        }
        return this._pool
    }

    public get readonlyPool() {
        if (!this._readonlyPool) {
            throw new Error('Readonly pool is already closed')
        }
        return this._readonlyPool
    }

    async close() {
        if (!this._pool) {
            dlog('Pool is already closed:', this.name)
            throw new Error('Pool is already closed')
        }
        if (!this._readonlyPool) {
            dlog('Readonly pool is aready closed:', this.name)
            throw new Error('Readonly pool is already closed')
        }

        dlog('Closing readonly connection to database:', this.name)
        await this._readonlyPool.end()
        this._readonlyPool = null

        dlog('Closing readwrite connection to database:', this.name)
        await this._pool.end()
        this._pool = null
        dlog('Database closed:', this.name)
    }

    async addConversationMem(args_: AddConvArgs): Promise<ID> {
        return addConversationMem(this.pool, args_)
    }

    async addFragmentMem(args_: AddFragArgs): Promise<ID> {
        return addFragmentMem(this.pool, args_)
    }

    // This adds multiple mementos in one transaction:
    // - a conversation exchange memento
    // - a conv memento for the user message
    // - a conv memento for the assistant message
    async addConvExchangeMementos(args_: AddConvExchangeArgs): Promise<ID> {
        return addConvExchangeMementos(this.pool, args_)
    }

    async linkExchangeSynopsis(args_: LinkExchangeArgs): Promise<void> {
        return linkExchangeSynopsis(this.pool, args_)
    }

    async addDocAndSummary(args_: AddDocAndSummaryArgs): Promise<DocAndSummaryResult> {
        return addDocAndSummary(this.pool, args_)
    }

    async addResolutionMem(args_: Resolution): Promise<ID> {
        return addResolutionMem(this.pool, args_)
    }

    async addSynopsisMem(args_: AddSynopsisArgs): Promise<ID> {
        return addSynopsisMem(this.pool, args_)
    }

    async getConversation(config: Config): Promise<Message[]> {
        return await getConversation(this.pool, config)
    }

    async getSynopses(args: GetSynopsesArgs): Promise<string[]> {
        return getSynopses(this.pool, args)
    }

    async get_last_user_message(): Promise<Message> {
        return get_last_user_message(this.pool)
    }

    async get_last_assistant_message(): Promise<Message> {
        return get_last_assistant_message(this.pool)
    }

    async getResolutions(): Promise<string[]> {
        const query = sql.type(Resolution)`
            SELECT
                content
            FROM
                memento
            WHERE
                kind = 'res'
            ORDER BY
                created_at ASC
            `
        const result = await this.pool.query(query)
        return result.rows.map((row) => Resolution.parse(row).content)
    }
}

export async function createMementoDbFromConfig(config: Config): Promise<MementoDb> {
    return await MementoDb.connect(config.database)
}
