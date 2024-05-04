// Path: packages/memento-agent/src/continuityLastUserMessage.ts

import { stripCommonIndent } from "@memento-ai/utils";

export const lastUserMessage = stripCommonIndent(`
    Based on the recent conversation exchanges and the existing pinned/unpinned conversation summary (csum) mems shown above, perform the following analysis:

    1. Identify any new major topics or subtopics that were introduced and create new csum mems following the <category>/<topic> naming convention. Categories can include now, soon, goal, dev, doc, etc. Aim for ~50 token summaries.

    2. Check if any important decisions were made, or if there were significant clarifications on existing topics that alter the context. Update the relevant csum mems accordingly.

    3. Remove redundant or obsolete information from existing csum mems.

    4. For topics discussed extensively, consider increasing the priority score of those csum mems.

    5. Any csum mems no longer relevant after this conversation should be unpinned or deleted.

    When creating new csum mems, prefer starting a new one over updating an existing vaguely related one. But use your judgment.

    To make updates, use the updateSummaries function, providing an array of updates including:
    - metaId: The category/topic ID of the csum mem
    - content: New content (omit if just changing pinned/priority)
    - pinned: True if this csum should be pinned, false to unpin
    - priority: An integer score for the relative priority

    Please also briefly explain your reasoning for each update. If no updates are needed, respond with "No action required."
`);
