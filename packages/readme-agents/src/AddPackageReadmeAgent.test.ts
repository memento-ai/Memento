// Path: packages/readme-agents/src/AddPackageReadmeAgent.test.ts

import { expect, describe, it } from "bun:test";
import { AddPackageReadmeAgent } from './AddPackageReadmeAgent';
import { count_tokens } from "@memento-ai/encoding";
import { getProjectRoot } from "@memento-ai/utils";
import { defaultProviderAndModel } from "@memento-ai/conversation";

describe('AddPackageReadmeAgent', () => {
    const projectRoot = getProjectRoot();
    const pkg = 'readme-agents';
    const { provider, model } = defaultProviderAndModel;
    const agent = new AddPackageReadmeAgent( { provider, model, projectRoot, pkg });

    it('should get the sources', async () => {
        const sources = await agent.getSources();
        expect(sources.length).toBeGreaterThan(0);
        const paths = sources.map(s => s.path);
        expect(paths).toContain('packages/readme-agents/README.md');
        expect(paths).toContain('packages/readme-agents/src/AddPackageReadmeAgent.test.ts');
    });

    it('should generate the prompt', async () => {
        const prompt = await agent.generatePrompt();
        const len = prompt.length;
        const tokens = count_tokens(prompt);
        console.info({ len, tokens });
        expect(len).toBeGreaterThan(15000);
        expect(tokens).toBeGreaterThan(4000);
    });

    it('should generate the Package README.md file', async () => {
        const readme = await agent.run();
        expect(readme).toContain('# @memento-ai/readme-agents');
    });
});
