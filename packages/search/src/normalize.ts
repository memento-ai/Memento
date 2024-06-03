// Path: packages/search/src/normalize.ts

// This function takes an array of items and a key function that extracts a number from each item.
// It normalizes the scores of the items using the softmax function.
// The softmax function is used to convert a vector of arbitrary real values into a vector of probabilities.
// This effectively normalizes the scores of the items so that they sum to 1.
export function softmaxNormalize<T>(arr: T[], key: (item: T) => number): T[] {
    const scores = arr.map(key);
    const expScores = scores.map(Math.exp);
    const sumExpScores = expScores.reduce((sum, score) => sum + score, 0);
    const softmaxScores = expScores.map((score) => score / sumExpScores);
    return arr.map((item, i) => ({...item, score: softmaxScores[i]}));
}

// As with softmax, produce an array of the same length as the input array, but with the scores normalized to sum to 1.
// The difference is that this function uses the scores directly, rather than exponentiating them.
// Requires that the scores are non-negative.
export function sumNormalize<T>(arr: T[], key: (item: T) => number): T[] {
    const scores = arr.map(key);
    const sumScores = scores.reduce((sum, score) => sum + score, 0);
    return arr.map((item, i) => ({...item, score: scores[i] / sumScores}));
}

// Normalize so that the range is 0..1
export function linearNormalize<T>(arr: T[], key: (item: T) => number): T[] {
    const scores: number[] = arr.map(key);
    const min: number = Math.min(...scores);
    const max: number = Math.max(...scores);
    return arr.map((item, i) => ({...item, score: (scores[i]-min)/(max-min)}))
}
