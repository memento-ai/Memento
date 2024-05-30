// Path: packages/continuity-agent/src/continuityLastUserMessage.ts

import { stripCommonIndent } from "@memento-ai/utils";

export const lastUserMessage = stripCommonIndent(`
    Based on the recent conversation exchanges and the existing pinned/unpinned conversation summary (csum) mems shown above,
    perform the following analysis:

    1. Identify any new major topics that were introduced and create new csum mems.
       Use short kebab case phrases for the topic metaId. These metaId strings cannot be longer than
       21 characters, and will be truncated if they exceed this limit.
    2. Check if any important decisions were made, or if there were significant clarifications on existing topics that
    alter the context. Update the relevant csum mems accordingly.
    3. Remove redundant or obsolete information from existing csum mems.
    4. Any csum mem that is no longer relevant to the recent conversation should be unpinned.
    5. Any csum unpinned csum mem that no longer serves a useful purpose should be soft deleted by setting its priority to 0.
    6. Avoid redundancy with existing csum mems.
    7. **NOTE**: please don't adjust the priorities of pinned csum mems unless there is a good justification to do so.

    To make updates, use the updateSummaries function, providing an array of updates including:
    - metaId: The category/topic ID of the csum mem
    - content: New content (omit if just changing pinned/priority)
    - pinned: True if this csum should be pinned, false to unpin
    - priority: An integer score for the relative priority

    NOTE: You are limited to no more than 3 updates per response.

    Priorties should be confined to the range of 0-4, using this scale:
    - 0: Soft deleted/purged csums (unpinned)
    - 1: Low priority, minor details
    - 2: Medium priority, useful context
    - 3: High priority, core topics/decisions
    - 4: Critical context, must be retained

    Aim for summaries informative and relevant to the current conversation context. Your summaries should generally be 50 to 200
    tokens long.

    **NOTE**: Do not include any other commentary or explanations in your response. Doing so will result in a MixedContentError.
`);
