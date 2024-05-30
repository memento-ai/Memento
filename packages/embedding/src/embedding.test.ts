// Path: packages/embedding/src/embedding.test.ts

import { expect, test } from "bun:test";
import { MyEmbeddingFunction } from "./embedding";

test("can generate", async () => {
    const embedding = new MyEmbeddingFunction();
    const result = await embedding.generate(["hello world", "goodbye world"]);
    expect(result).toBeTruthy();
    expect(result.length).toBe(2);
    expect(result[0].length).toBe(768);
    expect(result[1].length).toBe(768);
});
