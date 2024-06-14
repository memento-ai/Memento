// Path: packages/conversation/src/loggingTemplate.ts

import Handlebars from 'handlebars';
import type { SendMessageArgs } from './conversation';

export const loggingTemplate = Handlebars.compile<SendMessageArgs>(`
{{#*inline "inlinePrompt"}}
{{{ prompt }}}
{{/inline}}
{{#*inline "inlineContent"}}
{{{content}}}
{{/inline}}
{{#*inline "inlineMessages"}}
{{#each messages}}
<content role={{role}}>
    {{> inlineContent}}
</content>
{{/each}}
{{/inline}}
<send_message_log>
<system_log>
    {{> inlinePrompt }}
</system_log>
<conversation_log>
    {{> inlineMessages }}
</conversation_log>
</send_message_log>
`);
