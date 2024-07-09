// Path: packages/function-calling/src/extractFunctionCalls.test.ts

import { stripCommonIndent } from '@memento-ai/utils'
import { describe, expect, it } from 'bun:test'
import { extractFunctionCalls, type ExtractFunctionCallsResult } from '..'

describe('extractFunctionCalls', () => {
    it('should extract no function calls from empty content', () => {
        const content = ''
        const functionCalls: ExtractFunctionCallsResult = extractFunctionCalls(content)
        expect(functionCalls).toStrictEqual({
            syncCalls: [],
            asyncCalls: [],
            badCalls: [],
            thinking: '',
            hasCalls: false,
        })
    })

    it('should extract no function calls from plain content without markers', () => {
        const content = stripCommonIndent(`
            This is a few
            lines of nonsense
            for testing purposes
        `)
        const functionCalls: ExtractFunctionCallsResult = extractFunctionCalls(content)
        expect(functionCalls).toStrictEqual({
            syncCalls: [],
            asyncCalls: [],
            badCalls: [],
            thinking: content,
            hasCalls: false,
        })
    })

    it('should extract a function call from a pure function call request', () => {
        const content = '```function\n{\n  "name": "getCurrentTime",\n  "input": {}\n}\n```'
        const functionCalls: ExtractFunctionCallsResult = extractFunctionCalls(content)
        expect(functionCalls).toStrictEqual({
            syncCalls: [
                {
                    name: 'getCurrentTime',
                    input: {},
                },
            ],
            asyncCalls: [],
            badCalls: [],
            thinking: '',
            hasCalls: true,
        })
    })

    it('should extract multiple function calls', () => {
        const content = stripCommonIndent(`
            \`\`\`function
            {
                "name": "getCurrentTime",
                "input": {}
            }
            \`\`\`
            \`\`\`function
            {
                "name": "getListFiles",
                "input": {}
            }
            \`\`\`
        `)

        const functionCalls: ExtractFunctionCallsResult = extractFunctionCalls(content)
        expect(functionCalls).toStrictEqual({
            syncCalls: [
                {
                    name: 'getCurrentTime',
                    input: {},
                },
                {
                    name: 'getListFiles',
                    input: {},
                },
            ],
            asyncCalls: [],
            badCalls: [],
            thinking: '',
            hasCalls: true,
        })
    })

    it('should extract a function call with dirty json', () => {
        const content = stripCommonIndent(`
            \`\`\`function
            {
                "name": "writeSourceFile",
                "input": "This is a dirty json string
                with a newline in it"
            }
            \`\`\`
        `)
        const functionCalls: ExtractFunctionCallsResult = extractFunctionCalls(content)
        expect(functionCalls).toStrictEqual({
            syncCalls: [
                {
                    name: 'writeSourceFile',
                    input: 'This is a dirty json string\n    with a newline in it',
                },
            ],
            asyncCalls: [],
            badCalls: [],
            thinking: '',
            hasCalls: true,
        })
    })

    it('should extract a writeSourceFile function call with a json input', () => {
        const content = stripCommonIndent(`
            \`\`\`function
            {
                "name": "writeSourceFile",
                "input": {
                    "path": "./test.txt",
                    "number": 23
                }
            }
            \`\`\`
        `)
        const functionCalls: ExtractFunctionCallsResult = extractFunctionCalls(content)
        expect(functionCalls).toStrictEqual({
            syncCalls: [
                {
                    name: 'writeSourceFile',
                    input: {
                        number: 23,
                        path: './test.txt',
                    },
                },
            ],
            asyncCalls: [],
            badCalls: [],
            thinking: '',
            hasCalls: true,
        })
    })

    it('should extract a writeSourceFile function call with nested dirty json input', () => {
        const content = stripCommonIndent(`
            \`\`\`function
            {
                "name": "writeSourceFile",
                "input": {
                    "s": 'This is a dirty json string\n    with a newline in it'
                }
            }
            \`\`\`
        `)
        const functionCalls: ExtractFunctionCallsResult = extractFunctionCalls(content)
        expect(functionCalls).toStrictEqual({
            syncCalls: [
                {
                    name: 'writeSourceFile',
                    input: {
                        s: 'This is a dirty json string\n    with a newline in it',
                    },
                },
            ],
            asyncCalls: [],
            badCalls: [],
            thinking: '',
            hasCalls: true,
        })
    })

    it('should extract a writeSourceFile function call with content as realistic json object', () => {
        const content = stripCommonIndent(`
            \`\`\`function
            {
                "name": "writeSourceFile",
                "input": {
                    "filePath": "tsconfig.base.json",
                    "content": {
                        "compileOnSave": false,
                        "compilerOptions": {
                            "rootDir": ".",
                            "sourceMap": true,
                            "declaration": false,
                            "moduleResolution": "node",
                            "emitDecoratorMetadata": true,
                            "experimentalDecorators": true,
                            "importHelpers": true,
                            "target": "es2015",
                            "module": "esnext",
                            "lib": ["es2020", "dom"],
                            "skipLibCheck": true,
                            "skipDefaultLibCheck": true,
                            "baseUrl": ".",
                            "resolveJsonModule": true,
                            "isolatedModules": true,
                            "strict": true,
                            "esModuleInterop": true,
                            "paths": {}
                        },
                        "exclude": ["node_modules", "tmp"]
                    }
                }
            }
            \`\`\`
        `)
        const functionCalls: ExtractFunctionCallsResult = extractFunctionCalls(content)
        expect(functionCalls).toStrictEqual({
            syncCalls: [
                {
                    name: 'writeSourceFile',
                    input: {
                        content: {
                            compileOnSave: false,
                            compilerOptions: {
                                baseUrl: '.',
                                declaration: false,
                                emitDecoratorMetadata: true,
                                esModuleInterop: true,
                                experimentalDecorators: true,
                                importHelpers: true,
                                isolatedModules: true,
                                lib: ['es2020', 'dom'],
                                module: 'esnext',
                                moduleResolution: 'node',
                                paths: {},
                                resolveJsonModule: true,
                                rootDir: '.',
                                skipDefaultLibCheck: true,
                                skipLibCheck: true,
                                sourceMap: true,
                                strict: true,
                                target: 'es2015',
                            },
                            exclude: ['node_modules', 'tmp'],
                        },
                        filePath: 'tsconfig.base.json',
                    },
                },
            ],
            asyncCalls: [],
            badCalls: [],
            thinking: '',
            hasCalls: true,
        })
    })
})
