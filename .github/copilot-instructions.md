### GitHub Copilot Integration — RUGGER

You have access to a local orchestrator agent named **RUGGER**. Use RUGGER for complex, multi-step tasks that require delegation to specialists or long-running background work.

#### How to Use RUGGER

1. **For complex tasks**: Format a structured task request with title, description, and tags.
2. **Hand-off method**: Insert the task into the `~/.claw/inbox_entries` SQLite table.
3. **Response method**: RUGGER polls the inbox, executes the task, and updates the entry with results.
4. **You don't manage the team**: RUGGER handles internal delegation, spawning sub-agents, and orchestrating squads.

#### RUGGER's Capabilities

- **Ephemeral sub-agents**: Spawns developer, architect, researcher, qa, writer agents on-demand
- **Squads**: Temporary specialist teams that dissolve after work
- **Persistent memory**: Facts, decisions, learnings survive across sessions (stored at `~/.claw/topics.db`)
- **Scheduled jobs**: Background automation (hourly, daily, weekly, monthly)
- **Channel isolation**: Each project/workspace channel maintains isolated state and secrets

#### Safety Boundaries

- **No outbound communications** (Teams, email, webhooks) without explicit authorization
- **Channel routing**: Tasks respect channel boundaries; no cross-channel state leakage
- **Delegation limits**: Max 5 concurrent sub-agents; no recursive delegation
- **High-complexity tasks**: Require user confirmation before dispatch

#### Task Format Example

```json
{
  "title": "Analyze API performance regression",
  "description": "Profile the /users endpoint; identify bottleneck; suggest optimization",
  "tags": ["performance", "api", "critical"],
  "priority": "high",
  "channelId": "work-claw",
  "status": "pending"
}
```

#### Accessing Results

- Insert the task into `~/.claw/inbox_entries` (SQLite)
- Query the same table to check status, results, and `task_id`
- Artifacts are saved to `~/.claw/artifacts/` with date-based organization and tags

#### RUGGER's Identity

- **Name**: RUGGER
- **Runtime**: `C:\Program Files\CLAW\app`
- **Workspace**: `~/.claw/`
- **Inbox transport**: SQLite (`~/.claw/inbox_entries`)
- **Pattern**: Uber-agent/supervisor façade (you see one agent; many work together internally)

---

**End of Copilot Instructions Snippet**