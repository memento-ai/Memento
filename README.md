# Memento
A bespoke RAG system inspired by [MemGPT](https://memgpt.readme.io/docs/index) and the movie
[Memento](https://en.wikipedia.org/wiki/Memento_(film)).

## Introduction

## Requirements

- Memento is built using [Bun](https://bun.sh).
- Memento requires [ollama](https://ollama.ai) running locally for embeddings only.
- Memento currently works with two providers: `anthropic` and `ollama`. Any model provided by these providers may be
used, but for best results we recommend 'sonnet' or 'opus' from antropic, but beware the cost. 'haiku' is able to
work but Memento stretches its capabilities. While we have experimented with some open models via Ollama, we have
not yet found one is up to the task.

- Other providers:
- - We will support both OpenAI and Groq.

API keys must be provided via the environment (e.g. ANTHRIC_API_KEY).

### Postgres and the pgvector required

- PostgreSQL is required. We assume knowledge of basic administration.
- See [pgvector](https://github.com/pgvector/pgvector) for installation instructions.

### Other dependencies

To install dependencies:

```bash
bun install
```

To run tests:

```
bun test
```

Note that some tests use Claude 3 Haiku which is not free. Some tests use `dolphin-phi` via Ollama.

### Warning: alpha quality software.

- Expect bugs.
- Expect rough edges with design.
- Expect breaking changes with future releases.
- **Postgres**: Be aware that this code creates and drops databases as part of the unit tests
and when the `--clean-slate` option is provided on the command line.

### Running

To run the memento app via a command line interface:

```bash
bun run src/app/cli.ts --help    # to see usage
```

To create a fresh database, choose a name such as `memento` and run this command:

```bash
bun run src/app/cli.ts --provider anthropic --model haiku --database memento --clean-slate
```

The `model` may be either `haiku`, `sonnet` or `opus`, or any of the full
names as defined by the API.

Use ctrl-c to exit. To resume where you left off, run the same command again without the -`-clean-slate`` option.

### Ingesting files

The `src/app/ingest` application currently can ingest typescript (.ts)
and SQL (.sql) files below the current working directory. This
makes it possible to use Memento to assist in the design and implementation of new Memento features.
