# Agent Notes

## Agent

The Agent base class provides two methods:

### 1. Sending multiple user messages with given prompt
Agent.forward({ prompt, messages }: SendMessageArgs)
    return this.conversation.sendMessage({ prompt, messages }) ;

### 2. Sending a single user message with prompt on the fly
Agent.send({content}: SendArgs)
    const prompt = await this.generatePrompt();
    const message = constructUserMessage(content);
    return this.forward({prompt, messages: [message]})

All agent subclasses ultimately call one of these two methods.

## ChatSummarizerAgent
ChatSummarizerAgent.summarize({ content, source }: SummarizerArgs)
    return Agent.send({ content })

## AddPackageReadmeAgent
AddPackageReadmeAgent.run()
    Agent.send({content})        // content is a hardcoded prompt

## AddProjectReadmeAgent
AddProjectReadmeAgent.run()
    Agent.send({content})        // content is a hardcoded prompt

## SynopsisAgent
SynopsisAgent.run()
    Agent.send({content});      // hardcoded prompt
        Agent.forward()

## MementoAgent
MementoAgent.run({ content }: SendArgs)     // content is the user's message content
    this.recursiveSend()
        Agent.forward()
