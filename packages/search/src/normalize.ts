// Path: packages/search/src/normalize.ts

// This function takes an array of items and a key function that extracts a number (a "score") from each item.
// It return an array with the score normalized to use the full range of 0..1
export function linearNormalize<T>(arr: T[], key: (item: T) => number): T[] {
    if (arr.length == 0) {
        return arr
    }
    const scores: number[] = arr.map(key)
    const min: number = Math.min(...scores)
    const max: number = Math.max(...scores)
    if (min === max) {
        return arr.map((item) => ({ ...item, score: 0.0 }))
    }
    return arr.map((item, i) => ({ ...item, score: (scores[i] - min) / (max - min) }))
}
