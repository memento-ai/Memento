// Path: apps/memento-cli/src/main.ts

import type { SendArgs } from '@memento-ai/agent'
import type { Config } from '@memento-ai/config'
import { loadAggregateConfig } from '@memento-ai/config'
import { createMementoSystem } from '@memento-ai/memento-agent'
import { cleanUpLastUserMem } from '@memento-ai/postgres-db'
import { createTemporaryWritable } from '@memento-ai/utils'
import c from 'ansi-colors'
import { Command } from 'commander'

const program = new Command()

program
    .version('0.0.1')
    .description('A chatbot that persists the conversation')
    .argument('config', 'The path to the configuration file')

program.parse(process.argv)

const configPath = program.args[0]
const configData: Config = await loadAggregateConfig(configPath)

const system = await createMementoSystem(configData)

await cleanUpLastUserMem(system.db.pool)

let multiline = false
async function* collectLines() {
    let lines = []
    const prompt = c.red('\nYou: ')
    process.stdout.write(prompt)
    for await (const line of console) {
        if (line.trim() === '!!') {
            multiline = !multiline
            continue
        }
        if (!multiline) {
            yield [line]
            process.stdout.write(prompt)
        } else if (line.trim() === '**') {
            yield lines
            process.stdout.write(prompt)
            lines = []
        } else {
            lines.push(line)
        }
    }
}

for await (const lines of collectLines()) {
    const stream = createTemporaryWritable(process.stdout)
    stream.write(`${c.blue('Assistant: ')}`)
    const args: SendArgs = {
        content: lines.join('\n'),
        stream,
    }
    await system.mementoAgent.run(args)
}
