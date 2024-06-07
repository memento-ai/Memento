// Path: packages/resolution-agent/src/resolutionLastUserMessage.ts

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

`);
