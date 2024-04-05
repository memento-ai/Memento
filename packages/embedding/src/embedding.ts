import { Ollama, type EmbeddingsResponse } from 'ollama'

export class MyEmbeddingFunction {
    private ollama: Ollama;
    private model: string;

    constructor(model: string = 'nomic-embed-text') {
        this.model = model;
        this.ollama = new Ollama({host: `http://127.0.0.1:11434`})
    }

    async generateOne(text: string): Promise<number[]> {
        const response: EmbeddingsResponse = await this.ollama.embeddings({
            model: this.model,
            prompt: text,
        });
        return response.embedding;
    }

    public async generate(texts: string[]): Promise<number[][]> {
        return Promise.all(texts.map(text => this.generateOne(text)));
    }
}

export const embedding = new MyEmbeddingFunction();
