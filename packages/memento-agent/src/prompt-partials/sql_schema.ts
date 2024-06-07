// Path: packages/memento-agent/src/prompt-partials/sql_schema.ts

import { stripCommonIndent } from "@memento-ai/utils";
import Handlebars from "handlebars";

export type SqlSchemaPromptTemplateArgs = {
    databaseSchema: string,
};

const sql_schema_text = stripCommonIndent(`
    <sql_schema>
    The database schema definitions are defined by the following SQL statements.
    Only SQL queries that conform to these schemas are valid.

    \`\`\`sql
    {{databaseSchema}}
    \`\`\`

    The function queryMementoView can be used to execute any read-only SQL query on this schema.
    You should prefer to use the memento view but you may also query the mem and/or meta tables directly.
    </sql_schema>
`);

export const sql_schema = Handlebars.compile<SqlSchemaPromptTemplateArgs>(sql_schema_text);
