// Path: apps/transcript-generator/src/index.ts

import { program } from 'commander'
import fs from 'fs/promises'
import { queryMementos } from './queryMementos'
import { processConversation } from './processConversation'
import { formatTranscript, FormatType } from './formatTranscript'

program
  .requiredOption('-d, --database <name>', 'database name')
  .requiredOption('-s, --start <date>', 'start date (YYYY-MM-DD)')
  .requiredOption('-e, --end <date>', 'end date (YYYY-MM-DD)')
  .requiredOption('-f, --format <type>', 'output format (markdown or html)')
  .requiredOption('-o, --output <file>', 'output file path')
  .parse(process.argv)

const options = program.opts()

async function generateTranscript() {
  try {
    const startDate = new Date(options.start)
    const endDate = new Date(options.end)
    const format = options.format as FormatType

    if (format !== 'markdown' && format !== 'html') {
      throw new Error('Invalid format. Use "markdown" or "html".')
    }

    const mementos = await queryMementos(options.database, startDate, endDate)
    const processedConversation = processConversation(mementos)
    const formattedTranscript = formatTranscript(processedConversation, format)

    await fs.writeFile(options.output, formattedTranscript)
    console.log(`Transcript written to ${options.output}`)
  } catch (error) {
    console.error('Error generating transcript:', error)
    process.exit(1)
  }
}

generateTranscript()
