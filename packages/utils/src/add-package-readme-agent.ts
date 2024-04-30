// Path: packages/utils/src/add-package-readme-agent.ts
import { Agent } from "@memento-ai/agent";
import { type Provider, type ConversationInterface, createConversation, type SendMessageArgs } from "@memento-ai/conversation";
import type { Message } from "@memento-ai/types";

export interface ProviderAndModel {
    provider: Provider;
    model: string;
}

const defaultProviderAndModel: ProviderAndModel = {
    provider: 'anthropic',
    model: 'haiku'
}

export class AddPackageReadmeAgent extends Agent {
    constructor({ provider, model }: ProviderAndModel = defaultProviderAndModel) {
        const conversation: ConversationInterface = createConversation(provider, { model, temperature: 0.0, max_response_tokens: 1500, logging: {name: 'readmes'}  });
        const prompt = AddPackageReadmeAgent.makePrompt();
        super({conversation, prompt});
    }

    sendMessage({ prompt, messages }: SendMessageArgs): Promise<Message>
    {
        return this.conversation.sendMessage({prompt, messages});
    }

    static makePrompt() {
        return `
Your task is to generate a README.md file for a package in the Memento monorepo.
Memento is a Typescript application that uses PostgreSQL, so source files are primarily
Typescript (*.ts), but also include SQL files (*.sql) for database schema and queries.
You'll be given the root README.md file and all of repository source files in the package
as the content of the first 'user' message of the conversation.
The source files may include test files ending with .test.ts. Do not document these files,
but they will likely be useful for providing context about the package functionality
and example usage.

Output only the contents of the README.md without any additional commentary. Your response
will be used verbatim as the contents of the README.md file, so any additional commentary
you might otherwise add to explain your actions is not only not helpful but is actually
counter to the goal of this task.

The format of the package README.md file should be:
# Package Name
## Description
Briefly describe what the package does.
## Key Features
List the main features or capabilities of the package.
## Usage and Examples
Describe how to use the package, with examples if applicable.
`;
    }
}
