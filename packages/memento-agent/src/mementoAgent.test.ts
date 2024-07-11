// Path: packages/memento-agent/src/mementoAgent.test.ts

import type { SendArgs } from '@memento-ai/agent'
import { AgentConversationConfig, Config } from '@memento-ai/config'
import { ingestDirectory } from '@memento-ai/ingester'
import { MementoDb } from '@memento-ai/memento-db'
import { createMementoDb, dropDatabase } from '@memento-ai/postgres-db'
import type { AssistantMessage } from '@memento-ai/types'
import { getMementoProjectRoot } from '@memento-ai/utils'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import debug from 'debug'
import { nanoid } from 'nanoid'
import type { Interceptor } from 'slonik'
import { createMementoSystem, type MementoSystem } from './factory'
import type { MementoAgent } from './mementoAgent'

const dlog = debug('mementoAgent:test')

function sendArgs(content: string): SendArgs {
    return {
        content,
    }
}

const timeout = 60000

const interceptors: Interceptor[] = [
    {
        queryExecutionError: async (e, query) => {
            dlog({ e, query })
            return null
        },
    },
]

export type MakeTestSystemArgs = {
    database: string

    // True if the agent is wanted.
    synopsis?: boolean
    resolution?: boolean
}

export async function makeTestSystem(args: MakeTestSystemArgs): Promise<MementoSystem> {
    const { database, synopsis, resolution } = args

    // If the agent is not wanted, we pass in disabledAgent.
    // If the agent is wanted, we pass in undefined, which will create an agent from default configuration.
    const settings: Partial<Config> = { database }
    if (!synopsis) {
        settings.synopsis_agent = { ...AgentConversationConfig.parse({ role: 'synopsis', provider: 'none' }) }
    }
    if (!resolution) {
        settings.resolution_agent = AgentConversationConfig.parse({ role: 'resolution', provider: 'none' })
    }
    const config = Config.parse(settings)
    const system: MementoSystem = await createMementoSystem(config)
    return system
}

describe('MementoAgent', () => {
    let db: MementoDb
    let dbname: string
    let mementoAgent: MementoAgent
    let system: MementoSystem
    beforeEach(async () => {
        dbname = `test_${nanoid()}`
        await createMementoDb(dbname, interceptors)
        system = await makeTestSystem({ database: dbname })

        db = system.db
        expect(db).toBeTruthy()
        expect(db.name).toBe(dbname)
        expect(db.pool).toBeTruthy()

        mementoAgent = system.mementoAgent
    })

    afterEach(async () => {
        try {
            await mementoAgent.close() // this will close the DB
            await dropDatabase(dbname)
        } catch (e) {
            const err = e as Error
            dlog(err.message)
            dlog(err.stack)
        }
    })

    it(
        'can chat with the agent',
        async () => {
            const message: AssistantMessage = await mementoAgent.run(
                sendArgs('0. What did Leonard Shelby suffer from?'),
            )
            expect(message.content).toBeTruthy()
        },
        timeout,
    )

    it(
        'can chat with the agent and get a response',
        async () => {
            let message: AssistantMessage
            message = await mementoAgent.run(sendArgs('1. What did Leonard Shelby suffer from?'))
            expect(message.content).toBeTruthy()
            message = await mementoAgent.run(sendArgs('2. What is anterograde amnesia?'))
            expect(message.content).toBeTruthy()
            expect(message.content).toBeTruthy()
        },
        timeout,
    )

    it(
        'can chat with the agent about ingested content',
        async () => {
            await ingestDirectory({ db, dirPath: `${getMementoProjectRoot()}/packages/types` })
            const args = sendArgs(
                'Using **only** the information provided in the <additional_context>, what are the various kinds/types of MemMetaData? Do not consult the database, as it is a test database with very limited data.',
            )
            const message: AssistantMessage = await mementoAgent.run(args)
            expect(message.content).toBeTruthy()

            // generatePrompt() is normally called from run(). We can call it directly here because run() has been called.
            const prompt = await mementoAgent.generatePrompt()
            expect(prompt).toInclude(
                'The Memento system automatically retrieves information it believes may be relevant to the current conversation',
            )
            expect(prompt).toInclude('packages/types/src/metaSchema.ts')
        },
        timeout,
    )
})
