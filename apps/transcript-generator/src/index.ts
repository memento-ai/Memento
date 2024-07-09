import { Command } from 'commander';
import { queryMementos } from './queryMementos';
import { processConversation } from './processConversation';
import { formatTranscript } from './formatTranscript';
import { TranscriptOptions } from './types';

const program = new Command();

program
  .option('-d, --database <name>', 'Database name to connect to')
  .option('-s, --start <date>', 'Start date for the transcript (ISO 8601 format)')
  .option('-e, --end <date>', 'End date for the transcript (ISO 8601 format)')
  .option('-f, --format <type>', 'Output format (markdown or html)', 'markdown')
  .option('-o, --output <file>', 'Output file path')
  .parse(process.argv);

const options = program.opts();

async function generateTranscript(options: TranscriptOptions & { database: string }) {
  const startDate = new Date(options.start);
  const endDate = new Date(options.end);
  
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error('Invalid date format. Please use ISO 8601 format (e.g., "2023-01-01T00:00:00Z").');
  }

  const mementos = await queryMementos(options.database, startDate, endDate);
  const conversation = processConversation(mementos);
  const transcript = formatTranscript(conversation, options.format);
  // TODO: Write transcript to file
  console.log('Transcript generated successfully');
}

generateTranscript(options as TranscriptOptions & { database: string }).catch(console.error);
