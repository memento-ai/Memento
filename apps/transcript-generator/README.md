# Memento Transcript Generator

This utility generates formatted transcripts from Memento conversation data stored in the database.

## Installation

```bash
npm install
```

## Usage

```bash
npm run build
npm start -- -s "2023-01-01" -e "2023-12-31" -f markdown -o transcript.md
```

Options:
- `-s, --start <date>`: Start date for the transcript
- `-e, --end <date>`: End date for the transcript
- `-f, --format <type>`: Output format (markdown or html)
- `-o, --output <file>`: Output file path

## Development

To make changes to the utility, modify the TypeScript files in the `src` directory. Then rebuild the project using:

```bash
npm run build
```

## Contributing

Please submit bug reports, feature requests, and pull requests through the project's issue tracker.

## License

This project is licensed under the MIT License.
