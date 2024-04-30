// Path: packages/encoding/src/encoding.ts
import { get_encoding } from "tiktoken";

const enc = get_encoding("cl100k_base");

export function encode(text: string): Uint32Array {
    return enc.encode(text);
}

export function decode(encoded: Uint32Array): Uint8Array {
    return enc.decode(encoded);
}

export function decode_to_string(encoded: Uint32Array): string {
    return new TextDecoder().decode(enc.decode(encoded));
}

export function count_tokens(text: string): number {
    return enc.encode(text).length;
}
