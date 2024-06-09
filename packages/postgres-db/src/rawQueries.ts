// Path: packages/postgres-db/src/rawQueries.ts

import { sql, type CommonQueryMethods, type QueryResult, type DatabasePool } from 'slonik';
import { raw } from 'slonik-sql-tag-raw';
import { getProjectRoot } from '@memento-ai/utils';
import { Message } from '@memento-ai/types';

export async function executeFileQuery(conn: CommonQueryMethods, fileName: string): Promise<QueryResult<any>> {
    const root = getProjectRoot();
    const fullPath = `${root}/packages/postgres-db/sql/${fileName}`;
    const file = Bun.file(fullPath);
    const text = await file.text();
    const sqlFragment = raw(text, []);
    return await conn.query(sql.unsafe`${sqlFragment}`);
}

export async function delete_unreferenced_mems(conn: CommonQueryMethods) {
    await executeFileQuery(conn, 'delete_unreferenced_mems.sql')
}

export async function get_last_user_message(pool: DatabasePool): Promise<Message> {
    const query = sql.type(Message)`
SELECT role, content
FROM memento
WHERE role = 'user' and content NOT LIKE '''''''%result%'
ORDER BY created_at DESC
LIMIT 1;
`;
    const result: Message = await pool.one(query);
    return result;
}

export async function get_last_assistant_message(conn: CommonQueryMethods): Promise<Message> {
    const query = sql.type(Message)`
SELECT role, content
FROM memento
WHERE role = 'assistant'
ORDER BY created_at DESC
LIMIT 1;
`;
    const result = await conn.any(query);
    return result[0];
}
