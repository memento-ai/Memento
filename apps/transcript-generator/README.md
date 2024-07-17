# Transcript Generator

## Description
The Transcript Generator is a command-line utility designed to generate formatted transcripts from Memento conversation data stored in a PostgreSQL database. It allows users to extract conversations within a specified date range and output them in either Markdown or HTML format.

## Key Features
- Query conversation mementos from a Memento database for a specified date range
- Process raw mementos into a structured conversation format
- Generate transcripts in Markdown or HTML format
- Command-line interface for easy use and integration into scripts
- Supports NX monorepo commands for building, serving, linting, and type-checking

## Usage and Examples

### Installation
As part of the Memento monorepo, you need to clone the entire repository and install dependencies:

```bash
git clone https://github.com/memento-ai/Memento.git
cd Memento
bun install
```

### Building the Utility
To build the transcript generator:

```bash
nx build transcript-generator
```

### Running the Utility
To generate a transcript:

```bash
nx serve transcript-generator -- -d <database_name> -s <start_date> -e <end_date> -f <format> -o <output_file>
```

Options:
- `-d, --database <name>`: Name of the Memento database to query
- `-s, --start <date>`: Start date for the transcript (YYYY-MM-DD)
- `-e, --end <date>`: End date for the transcript (YYYY-MM-DD)
- `-f, --format <type>`: Output format (markdown or html)
- `-o, --output <file>`: Output file path

Example:
```bash
nx serve transcript-generator -- -d memento_db -s 2023-01-01 -e 2023-12-31 -f markdown -o conversation_transcript.md
```

### Additional Commands
- Linting: `nx lint transcript-generator`
- Type-checking: `nx type-check transcript-generator`

## Development
To make changes to the utility:
1. Modify the TypeScript files in the `apps/transcript-generator/src` directory.
2. Use the NX commands for building, linting, and type-checking to ensure code quality.
3. Test the utility with various input parameters to verify functionality.

## Contributing
Please submit bug reports, feature requests, and pull requests through the project's issue tracker.

## License
This project is licensed under the MIT License.
