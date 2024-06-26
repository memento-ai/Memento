// Path: packages/function-registry/src/getCurrentTime/getCurrentTime.test.ts

import { describe, expect, it } from 'bun:test'
import { registry } from '../registry'

describe('getCurrentTime', () => {
    it('should return the current time as an ISO 8601 formatted string', async () => {
        const getCurrentTime = registry['getCurrentTime']
        expect(getCurrentTime).toBeDefined()
        const currentTime: string = await getCurrentTime.fn({})
        expect(typeof currentTime).toBe('string')
        const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
        expect(currentTime).toMatch(dateRegex)
    })
})
