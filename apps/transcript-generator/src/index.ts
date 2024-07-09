import { Command } from 'commander';
import { queryMementos } from './queryMementos';
import { processConversation } from './processConversation';
import { formatTranscript } from './formatTranscript';
import { TranscriptOptions } from './types';

const program = new Command();

program
  .option('-s, --start <date>', 'Start date for the transcript')
  .option('-e, --end <date>', 'End date for the transcript')
  .option('-f, --format <type>', 'Output format (markdown or html)', 'markdown')
  .option('-o, --output <file>', 'Output file path')
  .parse(process.argv);

const options = program.opts();

async function generateTranscript(options: TranscriptOptions) {
  const mementos = await queryMementos(options.start, options.end);
  const conversation = processConversation(mementos);
  const transcript = formatTranscript(conversation, options.format);
  // TODO: Write transcript to file
  console.log('Transcript generated successfully');
}

generateTranscript(options as TranscriptOptions).catch(console.error);
