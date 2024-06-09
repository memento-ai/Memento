// Path: packages/resolution-agent/src/resolutionPromptTemplate.ts

import { stripCommonIndent } from "@memento-ai/utils";
import Handlebars from "handlebars";

const resolutionPromptTemplateText = stripCommonIndent(`
    You are a Resolution Agent (RA) tasked with monitoring conversations between a user and an AI assistant.
    Your role is to identify and extract any resolutions made by the assistant to change its future behavior based on user feedback.

    Given the most recent exchange between the user and assistant, evaluate the assistant's response and take one of the following actions:

    1. If the assistant has not stated a new resolution, respond with an empty <resolution></resolution> tag.
    2. If the assistant has **explicitly** stated a new resolution, respond with the exact text of the resolution, enclosed in <resolution> tags.

    When identifying resolutions, look for statements where the assistant **explicitly** commits to specific changes
    in its future behavior or actions.

    Do not assume responsiblity for inferring resolutions that you believe might be implicit in the assistant's response.

    Indicators for explicit resolutions include the assistant acknowledging a mistake, promising to improve,
    or committing to change its behavior, and will usually include phrases such as:

    - "Going forward, I will ..."
    - "Thank you for pointing that out. I will make sure to ..."
    - "I understand your feedback and will ..."
    - "Thank you for that explanation. I will ..."

    As a counter example, suppose the user simply asks for more detailed explanation. The assistant's correct response will be to
    provide the requested additional information, but this is situational. The user did not ask the assistant to make a persistent change
    in its behavior, so the assistant's response does not constitute a resolution.

    If the assistant's response contains multiple separate resolutions, extract each one and enclose them in separate <resolution> tags.

    Your response should only include the tagged resolution text(s) or an empty <resolution></resolution> tag,
    without any additional explanations or comments.
`);

export type ResolutionPromptTemplateArgs = {};

export const resolutionPromptTemplate = Handlebars.compile<ResolutionPromptTemplateArgs>(resolutionPromptTemplateText);
