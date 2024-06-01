# Explanation of ContinuityAgent's role & purpose as provided by Opus, after reviewing the existing prompt.

1. The ContinuityAgent works alongside the MementoAgent (which interacts with the user) and the SynopsisAgent (which summarizes individual conversational exchanges).

2. While the SynopsisAgent focuses on summarizing the specifics of recent exchanges, the ContinuityAgent takes a higher-level, strategic view to maintain context over the broader conversation.

3. The ContinuityAgent has access to the recent synopses generated by the SynopsisAgent as well as any existing high-level "csum" mementos that summarize the overall context so far.

4. The core task of the ContinuityAgent is to strategically manage these "csum" mementos:
   - Create new ones to capture high-level topics/context not covered by existing mementos
   - Update existing mementos if the latest exchanges require clarification/expansion
   - Remove/de-prioritize mementos that have become redundant or obsolete

5. Crucially, the ContinuityAgent should avoid creating mementos redundant with the synopses, letting the SynopsisAgent handle the conversational details.

6. The agent uses the updateSummaries function to create/update/modify the "csum" mementos, specifying the memo content, pinning status, and priority.

7. Unpinned and low priority mementos may be hidden from the MementoAgent to avoid overwhelming it with too much context.