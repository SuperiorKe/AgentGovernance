# Informal Economy Intelligence Agent — Project Context

## What This Is
A Claude Code sub-agent that produces structured market intelligence briefs for informal economy segments. Built for SuperiaTech product research workflows.

## Sub-Agent Location
`.claude/agents/informal-economy-intel.md`

## How to Invoke
In Claude Code, use the Task tool or direct delegation:

```
Use the informal-economy-intel agent to research [market segment].
```

**Example prompts:**
```
Use the informal-economy-intel agent to research Nairobi market vendors (mama mboga) and their stock/inventory challenges.
```
```
Use the informal-economy-intel agent to map the boda boda informal transport sector in Nairobi — pain points and existing apps.
```
```
Use the informal-economy-intel agent to research informal savings groups (chamas) in Kenya and the tools they use.
```

## Output
Agent saves a Markdown brief to `/outputs/[market-slug]-intel-brief.md`

## Typical Research Time
5–10 minutes depending on how many sources need fetching.

## Integration Points
- Feed output directly into: Mama Mboga feature planning, Afrimall market expansion, new project scoping
- Pair with: Job Application Agent (use research to write compelling project context in applications)
- Pair with: Dev Blog Agent (turn a brief into a thought-leadership article)

## Maintenance Notes
- If briefs are coming back thin, prompt the agent with a more specific sub-segment  
  (e.g., *"women vendors in Gikomba market"* vs. *"market vendors"*)
- For high-stakes research (investor decks, grant applications), run 2 separate queries  
  and cross-reference outputs
