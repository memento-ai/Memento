// Path: packages/search/src/softmaxNormalize.ts

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
