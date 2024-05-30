// Path: packages/encoding/src/encoding.test.ts

import { expect, describe, it } from "bun:test";
import { encode, decode, decode_to_string, count_tokens } from "./encoding";

describe("Encoding", () => {

    it("can encode and decode", async () => {
        const hello = "hello world";
        const encoded: Uint32Array = encode(hello);
        const decoded: Uint8Array = decode(encoded);
        expect(decoded).toBeTruthy();
        const decoded_string: string = decode_to_string(encoded);
        expect(decoded_string).toBe(hello);
    });

    it("can encode and decode with emoji", async () => {
        const hello = "hello world 😃";
        const encoded: Uint32Array = encode(hello);
        const decoded: Uint8Array = decode(encoded);
        expect(decoded).toBeTruthy();
        const decoded_string: string = decode_to_string(encoded);
        expect(decoded_string).toBe(hello);
    });

    it("can count tokens", async () => {
        const hello = "hello world";
        const count = count_tokens(hello);
        expect(count).toBe(2);
    });

});
