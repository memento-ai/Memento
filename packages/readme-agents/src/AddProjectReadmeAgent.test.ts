// Path: packages/readme-agents/src/AddProjectReadmeAgent.test.ts

import { expect, describe, it } from "bun:test";
import { AddProjectReadmeAgent } from './AddProjectReadmeAgent';
import { count_tokens } from "@memento-ai/encoding";
import { getProjectRoot } from "@memento-ai/utils";
import { defaultProviderAndModel } from "@memento-ai/conversation";

describe('AddProjectReadmeAgent', () => {
    const projectRoot = getProjectRoot();
    const { provider, model } = defaultProviderAndModel;
    const agent = new AddProjectReadmeAgent( { provider, model, projectRoot });

    it('should get the file listing', async () => {
        const paths = await agent.getSourcePaths();
        expect(paths.length).toBeGreaterThan(0);
        expect(paths[0]).toContain('.gitattributes');
    });

    it('should get the README.md files', async () => {
        const readmes = await agent.getReadmes();
        expect(readmes.length).toBeGreaterThan(0);
        const packages = readmes.map(r => r.package);
        expect(packages).toContain('utils');
        const tokens = readmes.reduce((acc, r) => acc + count_tokens(r.content), 0);
        expect(tokens).toBeGreaterThan(8000);
        console.log(tokens);
    });

    it('should generate the Project README.md file', async () => {
        const readme = await agent.run();
        expect(readme).toContain('# Memento');
        expect(readme).toContain('## Project Organization');
        expect(readme).toContain('### Packages');
        expect(readme).toContain('## Requirements');
        expect(readme).toContain('## Getting Started');
        expect(readme).toContain('## Contributing');
        expect(readme).toContain('## License');
    }, 60000);
});
