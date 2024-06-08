// Path: packages/resolution-agent/src/resolutionLastUserMessage.ts

import { stripCommonIndent } from "@memento-ai/utils";
import Handlebars from "handlebars";

export const lastUserMessageText = stripCommonIndent(`
    <exchange>
    <instruction>Please evaluate the following exchange for any resolutions made by the assistant:</instruction>
    <user>{{user}}</user>
    <assistant>{{asst}}</assistant>
    </exchange>
`);

export type LastUserMessage = {
    user: string;
    asst: string;
};

export const lastUserMessageTemplate = Handlebars.compile<LastUserMessage>(lastUserMessageText);
