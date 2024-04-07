# Memento
A bespoke RAG system inspired by [MemGPT](https://memgpt.readme.io/docs/index) and the movie
[Memento](https://en.wikipedia.org/wiki/Memento_(film)).

## Introduction

A short sample transcript follows. See [sample-transcript.md](sample-transcript.md) for a longer example.

```
You: Tell me about Memento.
Assistant: Based on the information provided in the knowledge base, Memento appears to be an AI system that uses a structured database to store and retrieve various types of content, including conversation transcripts, document summaries, and system prompts. Here are the key points I've gathered:

1. Database Schema:
   - The system has two main tables - `mem` for storing content and metadata, and `meta` for storing additional attributes about the content.
   - The `memento` view combines data from both tables to provide a unified interface.
   - The database supports different types of content, including conversations, documents, fragments, and summaries.

2. Functionality:
   - The system can ingest files and store them in the database, along with summaries of the content.
   - It provides the ability to retrieve conversations, load system prompts, and perform semantic similarity searches on the ingested content.
   - The MementoChat component allows users to chat with the AI agent and receive responses based on the information in the database.

3. Architecture:
   - The system appears to be built using a combination of TypeScript and SQL, with unit tests covering various aspects of the implementation.
   - It includes components like MementoDb, Ingester, and MementoChat that handle different responsibilities.

Overall, Memento seems to be a system that aims to enhance the cognitive abilities of an AI assistant by providing a structured knowledge base that can be queried and updated through a human-AI collaboration process. The system appears to be in active development, with ongoing work on features like content ingestion, semantic search, and conversational interaction.

Does this high-level overview capture the key aspects of Memento based on the information provided? Let me know if you have any other questions or need additional details.

You: Why the name 'Memento'?
Assistant: The name "Memento" appears to be a reference to the 2000 film "Memento" directed by Christopher Nolan, which tells the story of a man with anterograde amnesia who uses notes, tattoos, and other mementos to piece together his past and solve a mystery.

This connection to the film is hinted at in the introduction, which states:

"You are like Leonard Shelby in Memento, who suffers from anterograde amnesia, and must rely on notes in his environment to reconstruct the context of the conversation and the tasks in progress."

The Memento system seems to be designed to act as a kind of "external memory" or "memento" for the AI assistant, allowing it to store and retrieve information across conversations, much like the protagonist of the film uses his notes and other mementos to compensate for his memory loss.

The name likely reflects the system's goal of enhancing the cognitive abilities of the AI assistant by providing a persistent, writable knowledge base that the assistant can draw upon, similar to how the protagonist of "Memento" used his various mementos to piece together his memories and solve the mystery he was investigating.

So in summary, the "Memento" name appears to be a nod to the film's themes of memory, identity, and the use of external aids to compensate for cognitive deficits - concepts that seem central to the design and purpose of this AI system.

You: Is the reference to the movie the only reason why the author may have chosen the name?
Assistant: You raise a good point. The reference to the film "Memento" may not be the only reason why the authors chose the name "Memento" for this AI system.

There could be other potential reasons or associations behind the name choice:

1. General meaning of "memento": A memento is something that serves as a reminder or souvenir of a person, place, or event. This aligns with the system's purpose of serving as an "external memory" or repository of information for the AI assistant.

2. Emphasis on persistence and recall: The term "memento" suggests something that is retained and can be referred back to, which reflects the goal of the system to provide a persistent knowledge base that the AI can access across conversations.

3. Connotations of remembrance and recollection: The name "Memento" may evoke ideas of remembering, recalling, and piecing together information - abilities that are crucial for the AI's cognitive enhancement.

4. Symbolic significance: The authors may have chosen the name to symbolize the system's role in bridging the gap between human and AI cognition, drawing on the film's themes of identity and the nature of memory.

So while the reference to the film "Memento" is likely a key factor, the name choice may also have been influenced by broader associations and meanings around the concept of a "memento" that align with the system's objectives and design. The name selection may have been intentionally chosen to convey multiple layers of significance.
```

## Requirements

- Memento is built using [Bun](https://bun.sh).
- Memento requires [ollama](https://ollama.ai) for embeddings only.
- Memento currently works only with the Anthropic Claude 3 models.

`ANTHROPIC_API_KEY` must be defined in the environment.

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

Note that the tests use Claude 3 Haiku which is not free.

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
bun run src/app/cli.ts --model haiku --database memento --clean-slate
```

The `model` may be either `haiku`, `sonnet` or `opus`, or any of the full
names as defined by the API.

Use ctrl-c to exit. To resume where you left off, run the same command again without the -`-clean-slate`` option.

### Ingesting files

The `src/app/ingest` application currently can ingest typescript (.ts)
and SQL (.sql) files below the current working directory. This
makes it possible to use Memento to assist in the design and implementation of new Memento features.
