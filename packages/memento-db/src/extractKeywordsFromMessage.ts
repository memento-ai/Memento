// Path: packages/memento-db/src/extractKeywordsFromMessage.ts

import { sql, type DatabasePool } from 'slonik';
import { z } from 'zod';

export const ExtractKeywordsFromContentResult = z.object({
    lexeme: z.string(),
    tf: z.number(),
    idf: z.number(),
    tf_idf: z.number(),
});
export type ExtractKeywordsFromContentResult = z.infer<typeof ExtractKeywordsFromContentResult>;

export type ExtractKeywordsArgs = {
    content: string,
    numKeywords?: number,
};

export async function extractKeywordsFromMessage(dbPool: DatabasePool, args: ExtractKeywordsArgs): Promise<ExtractKeywordsFromContentResult[]> {
    const {content, numKeywords=5 } = args;
    const query = sql.type(ExtractKeywordsFromContentResult)`
        WITH msg_stats AS (
            SELECT
            lexeme,
            ROUND(COUNT(*) * 1.0 / (SELECT COUNT(*) FROM unnest(to_tsvector('english', ${content}))), 4) AS tf
            FROM unnest(to_tsvector('english', ${content}))
            GROUP BY lexeme
        ),
        corpus_stats AS (
            SELECT
            word AS lexeme,
            ROUND(LOG((SELECT COUNT(*) FROM memento) / ndoc)::NUMERIC, 4) AS idf
            FROM ts_stat('SELECT tssearch FROM memento')
        )
        SELECT
            msg_stats.lexeme,
            msg_stats.tf,
            corpus_stats.idf,
            ROUND(msg_stats.tf * corpus_stats.idf, 4) AS tf_idf
        FROM msg_stats
        JOIN corpus_stats ON msg_stats.lexeme = corpus_stats.lexeme
        ORDER BY tf_idf DESC
        LIMIT ${numKeywords};
        `;

    return dbPool.connect(async (connection) => {
        const result = await connection.query(query);
        return result.rows.map((row) => row);
    });
}

export const MementosSimilarToContent = z.object({
    id: z.string(),
    kind: z.string(),
    content: z.string(),
    source: z.string(),
    rank: z.number(),
});
export type MementosSimilarToContent = z.infer<typeof MementosSimilarToContent>;

export type SelectMementosSimilarArgs = ExtractKeywordsArgs & {
    maxTokens?: number,
};

export async function selectMementosSimilarToContent(dbPool: DatabasePool, args : SelectMementosSimilarArgs): Promise<MementosSimilarToContent[]> {
    const { content, maxTokens=5000, numKeywords=5 } = args;
    const keywords = await extractKeywordsFromMessage(dbPool, {content, numKeywords});

    const keywordQuery = keywords.map((keyword) => keyword.lexeme).join(' | ');
    console.log('keywordQuery:', keywordQuery);

    const query = sql.type(MementosSimilarToContent)`
        WITH query AS (
            SELECT to_tsquery('english', ${keywordQuery}) AS query
        ),
        ranked_mementos AS (
            SELECT
                m.id,
                m.kind,
                m.content,
                m.source,
                m.tokens,
            ts_rank(m.tssearch, query.query) AS rank
            FROM memento m, query
            WHERE m.tssearch @@ query.query
            ORDER BY rank DESC
        ),
        mementos_with_running_sum AS (
            SELECT
                id,
                kind,
                content,
                rank,
                tokens,
                SUM(tokens) OVER (ORDER BY rank DESC) AS total_tokens
            FROM ranked_mementos
        )
        SELECT
            id,
            kind,
            content,
            rank
        FROM mementos_with_running_sum
        WHERE total_tokens <= ${maxTokens}
        ORDER BY rank DESC;`;

    return dbPool.connect(async (connection) => {
        const result = await connection.query(query);
        return result.rows.map((row) => row);
    });
}
