// Path: packages/utils/src/temporary-writable.ts

import { Writable } from 'node:stream'

// This function is a utility function that creates a temporary writable stream that may be closed
// without closing the underlying stream.

// This function is overloaded to accept either a Writable stream or undefined
// which is convenient in cases where Typescript can infer the if the type is undefined or not.
// However, there are cases where Typescript cannot infer the type so the code will have
// to perform runtime checks.

function createTemporaryWritable(u: undefined): undefined
function createTemporaryWritable(u: Writable): Writable
function createTemporaryWritable(u: undefined | Writable): undefined | Writable {
    if (u === undefined) {
        return undefined
    } else {
        return new Writable({
            write(chunk, encoding, callback) {
                if (!u.write(chunk, encoding)) {
                    u.once('drain', callback)
                } else {
                    callback()
                }
            },
            final(callback) {
                // Don't close the underlying stream when this stream ends
                callback()
            },
        })
    }
}

export { createTemporaryWritable }
