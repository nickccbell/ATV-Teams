# ATV-Teams, Rugger, and Your AI Assistant Ecosystem

**A Clinical Briefing for Nick**

---

## SECTION 1: ATV-Teams Overview

### What Is ATV-Teams?

ATV-Teams is a **Node.js server + React UI control plane** for human-directed teams of AI agents. It solves the problem of coordinating multiple AI agents toward a common business goal while keeping costs transparent, maintaining human control, and preventing agents from working at cross-purposes.

**The headline:** "You set the goal. Your AI team gets it done. You stay in the loop."

Instead of managing scattered Copilot chat sessions, scripts, and manual agent orchestration, ATV-Teams gives you a central dashboard where:

- **One human or small board** directs a fleet of AI agents (2-agent project to company-wide org)
- **Agents have roles, reporting lines, budgets, and a shared goal hierarchy** (company → team → agent → task)
- **Work is ticket-based** — tasks persist across sessions; context never gets lost
- **Costs are tracked and capped** — monthly per-agent budgets with hard stops (no runaway spend)
- **Approval gates exist for decisions that matter** — board members can override, pause, or terminate any agent
- **Execution is scheduled** — agents wake on a "heartbeat" (a recurring schedule), check for work, and act autonomously

### Problem It Solves

Without ATV-Teams:
- ❌ You have 20 Copilot sessions open; on reboot you lose everything
- ❌ Agents reinvent context from scratch on each invocation
- ❌ You manually enforce budgets and token limits
- ❌ No visibility into what 5 different agents are simultaneously doing
- ❌ Recurring jobs (daily reports, customer support) require manual kicks

With ATV-Teams:
- ✅ Tasks are ticket-based, threaded, and survive reboots
- ✅ Goal context flows from company mission → agent → task; agents always know *why*
- ✅ Per-agent monthly budgets; automatic pause when limits hit
- ✅ One dashboard shows every agent's work, status, and cost burn
- ✅ Heartbeats handle recurring work on schedule; you supervise

### Core Concepts & Primitives

**Company** — A first-order organizational unit (a legal company, a team, a project, or a client engagement). One ATV-Teams deployment can run multiple companies with complete data isolation.

**Goal** — Each company has a top-level goal that cascades down. Example: "Ship our v2 launch in 6 weeks, on schedule and on budget." Every task traces back to this goal through parent-child links.

**Agent (Employee)** — Each executor is an AI agent. You hire them (create them), assign them a role, title, and reporting line. Agents have:
  - An **adapter type** (how they run: local GitHub Copilot CLI, Claude Code, process, HTTP webhook, etc.)
  - **Adapter config** (agent identity, heartbeat behavior, runtime settings)
  - **Role + reporting** (CEO, CTO, engineer, etc.; who they report to and who reports to them)
  - **Monthly budget** (tokens/cost limit)

**Task (Issue)** — Atomic unit of work. Tasks have:
  - A single assignee (atomic checkout prevents double-work)
  - Parent/child hierarchy (all trace to company goal)
  - Comments, documents, attachments
  - Status (backlog, assigned, in_progress, blocked, done, etc.)
  - Blockers (dependencies on other tasks)

**Heartbeat** — The execution trigger. On a schedule, ATV-Teams:
  1. Wakes a sleeping agent
  2. Tells it: "Check your tasks. Pick the highest priority. Work it until done or blocked."
  3. Tracks the run (cost, logs, output)
  4. Passes results back into the work queue
  5. Lets humans approve or override before the agent moves to the next task

**Approval Gate** — Board members can review agent strategy proposals, override decisions, hire/fire agents, or pause work at any time.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│               ATV-TEAMS CONTROL PLANE (This Software)            │
│                                                                  │
│  [Identity & Access] [Org Chart & Agents] [Work & Tasks]         │
│  [Heartbeat Execution] [Budget & Costs] [Governance & Approvals] │
│  [Company Portability] [Secrets & Storage] [Activity Log]        │
└─────────────────────────────────────────────────────────────────┘
        ▲              ▲              ▲              ▲
   ┌─────┴─────┐  ┌─────┴─────┐  ┌─────┴─────┐  ┌─────┴─────┐
   │ GitHub    │  │ Sandbox   │  │ Repo      │  │ Board &   │
   │ Copilot   │  │ workspaces│  │ sessions  │  │ approvals │
   │ (primary) │  │           │  │           │  │           │
   └───────────┘  └───────────┘  └───────────┘  └───────────┘
```

Agents run *outside* the control plane. ATV-Teams:
- Manages the org chart, task queue, budgets, and approvals
- Invokes agents via adapters (process, HTTP, CLI session, webhook)
- Receives heartbeat reports and cost events back
- Stores work context, comments, and audit trails in its database

### How to Run & Use It

**Local dev setup:**
```bash
pnpm install
pnpm dev
```

This starts:
- API: `http://localhost:3100`
- UI: `http://localhost:3100` (served by the same server)

**Deployment modes:**
- **local_trusted** — runs on your machine; board auth is implicit (you're the admin)
- **authenticated** — multi-user; sessions + API keys; can be self-hosted or cloud-deployed

**Step-by-step user flow:**
1. Create a company (define the goal, e.g., "Ship v2 launch")
2. Create agents (CEO/lead, specialists, reviewers) and assign adapters
3. Define the org chart (who reports to whom)
4. Create tasks tied to the company goal
5. Hit "go" and monitor from the dashboard
6. Review heartbeat results; approve, override, or terminate as needed
7. Watch costs track against budgets

**Database:**
- Uses PostgreSQL (or embedded PGlite in dev if `DATABASE_URL` is unset)
- Schema managed via Drizzle ORM
- Company-scoped data model (all entities belong to a company)

### What's Not Included

Out of scope for V1:
- Cloud-grade plugin marketplace (self-hosted plugin loading is in scope)
- Knowledge base/RAG subsystem
- Separate chat system (tasks + comments only)
- Revenue/expense accounting beyond token costs
- Public marketplace or public agent registry

---

## SECTION 2: PaperClip & the Fork Relationship

### What Is PaperClip?

**PaperClip is the origin project.** It is an open-source orchestration system for teams of AI agents, with nearly identical architecture and feature set to ATV-Teams. The core team behind PaperClip is at `paperclipai/paperclip` on GitHub. PaperClip is described as: "Open-source orchestration for teams of AI agents" and "the app people use to manage AI agents for work."

**Key features of PaperClip (upstream):**
- Control plane for AI agent teams
- Bring-your-own-agent: supports OpenClaw, Claude Code, Codex, Cursor, and bash/HTTP
- Goal alignment, org charts, budgets, heartbeats
- Multi-company isolation, audit logs, approval gates
- Node.js server + React UI
- Self-hostable

### ATV-Teams as a Fork

**ATV-Teams is a fork of PaperClip.** According to `AGENTS.md` in the ATV-Teams repo (section 11, "Fork-Specific: shyamsridhar123/ATV-Teams"):

**What was inherited:**
- Complete control-plane architecture (task queue, org chart, heartbeat system, budget enforcement)
- Adapter system (process, HTTP, local CLI sessions, OpenClaw gateway)
- Plugin/skill loading framework
- Database schema (Drizzle ORM, PostgreSQL with PGlite fallback)
- React UI structure
- Core engineering patterns and separation of concerns

**What changed or was added:**
- **Rebrand to "ATV-Teams"** — display name, READMEs, docs, UI titles, CLI banner, `package.json` identity now reflect "ATV-Teams"
- **Kept PaperClip internals for back-compatibility** — workspace package names still `@paperclipai/*`, CLI binary still `paperclipai`, config dir still `~/.paperclip/`
- **References redirected** — docs and URLs that pointed to `paperclipai/paperclip` now point to `shyamsridhar123/ATV-Teams`
- **Community URLs dropped** — external community links (paperclip.ing, Twitter, Discord) from upstream are not carried forward
- **All The Vibes positioning** — ATV-Teams is positioned as part of the broader "All The Vibes" (ATV) community/culture project (Feb 2026 hackathon)

**Fork lineage is confirmed in the repo.** The structure, V1 spec, and behavior are nearly identical because ATV-Teams *is* PaperClip with a rebrand and some community repositioning.

---

## SECTION 3: Rugger (WorkClaw) vs ATV-Teams — Clinical Comparison

### What Is Rugger / WorkClaw?

**Rugger (also called WorkClaw) is YOUR existing agent system.** It runs locally on your machine via the GitHub Copilot CLI as the transport layer, surfaced in the **Clawpilot** Electron shell. Nick describes it as "a workspace for sub agents."

**Rugger capabilities:**
- Manages specialized sub-agents (custom agents like dlabs-stack-developer, corp-browser, researcher, etc.)
- Persistent memory system (topic graph, structured memory, daily logs)
- Channel-based work routing and delegation
- Scheduled jobs and heartbeats
- Concierge/delegate operating model ("spawn_sub_agent", "ask_user", "memory_read/write")
- Asynchronous task tracking and progress reporting
- Sub-agent pool management and concurrent execution limits

**Rugger's philosophy:** "A workspace for sub agents" — it's an orchestration and delegation layer on top of Copilot CLI, designed for you (Nick) to spawn and manage specialized agents for specific tasks, with persistent state across sessions.

### ATV-Teams at a Glance

**ATV-Teams is a general-purpose control plane** for **teams of AI agents** where you are one of potentially many humans on a board directing the team. It's designed for:
- Multi-agent coordination at scale (2-person projects to company-wide orgs)
- Cost visibility and governance
- Approval workflows and human oversight
- Persistent task management and goal hierarchies
- Self-hosted or cloud deployment

### Head-to-Head Comparison

| Dimension | Rugger / WorkClaw | ATV-Teams |
|-----------|-------------------|-----------|
| **Core Purpose** | Sub-agent dispatcher & memory layer for one user (you) | General-purpose control plane for human-directed AI teams (any size) |
| **User Model** | Single-user concierge system; you spawn and delegate work | Multi-user board model; one board directs the org (V1 supports 1 board, but model is multi-user-ready) |
| **Agent Definition** | Python/Node sub-agent scripts; in-memory or spawned dynamically | AI agents via adapters; configured with role, adapter type, config, and budget |
| **Persistence** | Memory topics (prose + structured), daily logs, session history | Full relational database (PostgreSQL); company/agent/task/cost/audit schema |
| **Task/Work Model** | Task objects with progress tracking, assignment to roles | Hierarchical task/issue system with parent/child, blockers, single assignee, atomic checkout |
| **Org Structure** | Informal; agents are spawned on demand | Formal org chart; strict reporting tree; roles and titles |
| **Execution Trigger** | Manual spawn ("spawn_sub_agent") + scheduled jobs ("schedule_manage") | Heartbeats on a schedule; agents wake, check tasks, work autonomously |
| **Budget/Cost Control** | No built-in budget enforcement | Per-agent monthly budgets; hard stops on spend; cost event tracking |
| **Approval Gates** | No governance workflow | Board approvals for hires, strategy, and high-stakes decisions |
| **Where It Runs** | Locally on your machine; uses Copilot CLI as transport | Self-hosted (local or server) + cloud-deployable |
| **Agent Runtime** | Copilot CLI sessions + sub-agent spawning via tools | Multiple: GitHub Copilot CLI, Claude Code, Codex, process, HTTP webhook, OpenClaw gateway, Cursor, etc. |
| **UI** | Clawpilot Electron shell (terminal-based, channel browsing) | React web dashboard + board UI |
| **Scope of Data** | Personal; one user's tasks and memory | Company-scoped; multi-company isolation, board visibility |
| **Primary Transport** | GitHub Copilot CLI | REST API (HTTP); adapters invoke agents externally |

### Do They Do the Same Thing?

**No — they are complementary, not interchangeable.**

- **Rugger is a personal sub-agent orchestrator** — a workspace and memory layer for *you* to manage specialist agents that help *you* accomplish goals
- **ATV-Teams is a team control plane** — infrastructure for *teams* of agents (or simulated agents) directed by humans toward shared goals

### When Should You Use Each?

**Use Rugger when:**
- You are the primary actor and you need to spawn specialist agents to help you accomplish a task
- You want persistent memory across sessions (topic graph, structured facts)
- You need asynchronous delegation ("I'll ask this agent to research X; I'll check back later")
- You're working solo or with a small team where you're the central coordinator

**Use ATV-Teams when:**
- You want to simulate or run an actual team of agents (e.g., a CEO agent directing engineers, designers, and marketers)
- You need formal org structure, roles, reporting lines, and governance
- Cost control and budget enforcement matter
- You want work tracked as persistent tasks with approval workflows
- You're building a demo, prototype, or actual AI-native business simulation
- You want multi-agent execution on a schedule (heartbeats) rather than manual invocation

### Can They Be Used Together?

**Yes — with caveats.**

**Scenario 1: Rugger as an agent adapter in ATV-Teams**
- You could theoretically write an ATV-Teams adapter that invokes Rugger's `spawn_sub_agent` API
- Rugger would become a "runtime" that ATV-Teams can schedule heartbeats against
- This would let ATV-Teams delegate to Rugger, which in turn manages your specialist agents
- **Status:** Not built today; would require custom adapter code

**Scenario 2: ATV-Teams as a task system within Rugger**
- You could use ATV-Teams as the backing store for a particular Rugger sub-agent
- That agent could read tasks from ATV-Teams and report back results
- This would let ATV-Teams be one *application* managed by Rugger
- **Status:** Not built today; would require Rugger task_manage tool to hit ATV-Teams API

**Scenario 3: Run them in parallel**
- Use Rugger for your day-to-day personal agent work (research, writing, one-off tasks)
- Use ATV-Teams to prototype or simulate a team of AI agents (for demos or business simulation)
- They don't conflict; they just run separately
- **Status:** Works today; no integration needed

### Recommendation for Nick

**Start with Rugger for what you're already doing** — it's purpose-built for your workflow.

**Experiment with ATV-Teams if you want to:**
1. **Build a multi-agent simulation** — e.g., a CEO + engineers + designers working together, each controlled by Copilot, all coordinated by ATV-Teams
2. **Prototype AI-native businesses** — ATV-Teams is explicitly designed for this; it's the "company operating system"
3. **Explore goal-driven AI coordination** — see how a formal goal hierarchy and budget constraints change agent behavior
4. **Share a control plane with others** — if you ever want multiple humans to collectively direct a team of agents, ATV-Teams's multi-user board model is the foundation

**Do not try to replace Rugger with ATV-Teams.** ATV-Teams is not a sub-agent dispatcher. If you need specialist agents spawned dynamically with personal memory, Rugger is the right tool.

---

## SECTION 4: Comparison Matrix — All of Nick's AI Assistants

Here's a consolidated view of your entire AI assistant ecosystem:

### The Tools

| Tool | Intent / Primary Purpose | Where It Runs | Best-Fit Use Case | Overlaps With |
|------|--------------------------|---------------|-------------------|---------------|
| **GitHub Copilot CLI** | Code completion, terminal chat, and agent runtime transport | Local terminal + IDE | Day-to-day coding; Copilot chat sessions; also the transport layer for Rugger | Copilot IDE ext; Rugger (transport); Chamber (Copilot SDK) |
| **Clawpilot** | Electron desktop shell; surfaces Rugger workspace and channels | Your local machine (Electron) | Browse and interact with Rugger channels, memory, task queue, and spawn decisions | Rugger (the underlying system); GitHub Copilot CLI (used by Rugger agents) |
| **WorkClaw / Rugger** | Sub-agent dispatcher, memory layer, and orchestrator for your personal agent fleet | Local daemon (via Copilot CLI transport) | Spawn specialist agents, delegate work, manage persistent memory, run scheduled jobs | Clawpilot (UI); GitHub Copilot CLI (transport); Chamber (similar A2A philosophy, but different stack) |
| **Chamber** | A2A-first desktop workspace for creating, running, and coordinating AI agents | Local Electron app | Agent-to-agent delegation, task handoff, mind discovery, and multi-agent chatrooms | GitHub Copilot SDK; Rugger (agent orchestration); ATV-Teams (agent coordination, but different scope) |
| **ATV-Teams** | Control plane for human-directed AI teams; org chart, budgets, approval gates | Self-hosted server (can be local or remote) + React web UI | Team simulation, multi-agent coordination with formal governance, AI-native business prototyping | Rugger (could integrate via adapter); Chamber (similar A2A spirit, different layer); GitHub Copilot (primary execution adapter) |
| **WorkPilot** | **Microsoft-internal autonomous AI assistant** — codes, communicates, and ships across the M365 stack; proactive + security-gated. Heartbeat, skills-extraction, scheduled jobs, plain-text memory, risk-scored approvals | Self-hosted local daemon (`workpilot.exe serve` on localhost:3003) + Edge PWA; delivered in **Microsoft Teams** & Web Chat | Official, Teams-native personal orchestration with governance (0–10 risk scoring, approval cards, E-Stop, credential scanning). Background delegation to Claude Code / GitHub Copilot | **Rugger (closest sibling — same personal-orchestrator + heartbeat + skills + memory + delegation pattern)**; GitHub Copilot / Claude Code (delegation targets); Teams (delivery surface) |

### Short Blurbs

**GitHub Copilot CLI**
- The foundational AI runtime. Every Copilot session starts here. For Rugger, it's also the *transport* (Rugger uses Copilot CLI to invoke agents and carry messages).
- You'll use it directly for chat, coding, and terminal automation.
- Essential component in your stack; Rugger and Chamber both depend on Copilot or its SDK.

**Clawpilot**
- The visual shell for Rugger. Think of it as the desktop UI that makes Rugger's workspace browsable.
- Shows channels, memory topics, task queue, agent spawning UI, and lets you interact with Rugger programmatically.
- Run on Windows; displays your sub-agent workspace.

**WorkClaw / Rugger**
- Your core orchestration layer. It's where you *direct* specialist agents to accomplish tasks.
- Manages memory (topics, structured facts), schedules jobs, spawns sub-agents on demand.
- Designed for **you** as the conductor; central to your daily workflow.

**Chamber**
- An A2A-first workspace. Instead of traditional chat, Chamber gives agents *minds* (identities, memory, skills) and lets them discover, message, and delegate to each other.
- Focus is on agent-to-agent handoff and multi-mind chatrooms (concurrent, sequential, moderated, manager-led modes).
- Runs locally as Electron app; integrates with GitHub Copilot SDK.
- **Vibe:** Similar spirit to Rugger (personal, collaborative, agent-forward) but different technical approach (minds vs. sub-agents).

**ATV-Teams**
- A team control plane. Purpose-built for simulating or running actual organizations of agents.
- Formal org structure, goal hierarchies, budgets, approval gates, and persistent task management.
- Runs as a server (self-hosted) + web UI; can manage multiple companies.
- **Vibe:** Enterprise governance model; opposite of "do whatever feels right" — everything aligns to company goals and budgets.

**WorkPilot** *(resolved 2026-06-14)*
- **Status: IDENTIFIED & INSTALLED LOCALLY.** Repo `github.com/gim-home/WorkPilot` is **Microsoft INTERNAL** (not 404 to your authenticated `gh`; anonymous lookups fail). Python 3.11+, actively developed (pushed 2026-06-14). Site: `workpilot.newfuture.cc` → "Enterprise AI Assistant, Microsoft Internal Preview."
- **What it is:** An *autonomous* AI assistant that "codes, communicates, and ships across your entire Microsoft stack — proactively and securely." Powered by GPT-5.5 + Claude Opus 4.8 + more.
- **Running on your box right now:** `C:\Users\nickbell\.local\bin\workpilot.exe serve` (installed 6/3/2026), **listening on localhost:3003**. You open it as an Edge PWA (`http://localhost:3003/#/chat`); it auto-starts at login via `workpilot-serve.vbs` + a Startup shortcut.
- **Why it matters — it's Rugger's closest sibling.** Near-identical pattern to WorkClaw/Rugger: **heartbeat** that learns from history + extracts reusable **skills**; **scheduled jobs** in plain language; **background delegation** (can hand off to Claude Code / GitHub Copilot); **memory as plain text** you can read/edit/delete; plus governance Rugger doesn't enforce by default — **0–10 risk scoring** (auto-execute / timed auto-approve / human approval / block), **approval cards pushed to Teams**, **global E-Stop**, two-stage credential leak scanning, command/path sandboxing.
- **Clinical verdict:** WorkPilot ≈ a **Microsoft-sanctioned, Teams-native, security-gated cousin of Rugger**. The biggest capability overlap in your entire stack is **Rugger ↔ WorkPilot**. Difference is posture/surface: WorkPilot = official + Teams-delivered + governance-by-default; Rugger = local, hackable, you-as-conductor. Use WorkPilot when you want sanctioned, auditable autonomy that pushes approvals to your phone via Teams; use Rugger when you want full control and customization of the orchestration layer itself.

### Overlap & When-to-Use Synthesis

**Three layers; each serves a different role:**

**Layer 1: Coding & Terminal (GitHub Copilot CLI)**
- This is the bedrock. Everything above it depends on Copilot for execution.
- Use directly for: coding tasks, terminal automation, Copilot chat
- Used *by*: Rugger (transport), Chamber (SDK), ATV-Teams (Copilot adapter)

**Layer 2: Personal Orchestration (Rugger + Clawpilot)**
- **For you, personally.** You spawn agents, delegate work, track progress, and manage memory.
- Use when: You need specialist agents to help *you* accomplish goals; you want persistent task state across sessions
- Surfaced through: Clawpilot (visual), or programmatically via Rugger task/spawn/memory tools
- Alternative in same space: Chamber (but Chamber is more A2A-collaborative; Rugger is more director-focused)

**Layer 3: Team & Governance (ATV-Teams + Chamber)**
- **For simulating or running teams.** These are systems where agents coordinate with *each other*, not just take orders from you.
- **ATV-Teams:** Formal org structure, goals, budgets, approval gates. Use for business simulation, demos, governance-heavy scenarios.
- **Chamber:** A2A delegation, mind discovery, shared operating room. Use for collaborative agent scenarios, A2A handoff.
- Note: ATV-Teams and Chamber address the same general space (multi-agent coordination) but with different philosophies. ATV-Teams is top-down + budget-driven; Chamber is peer-to-peer + discovery-driven.

**Decision tree for Nick:**

```
Do you want a specialist agent to help YOU accomplish a task?
  → YES: Use Rugger (spawn_sub_agent, task_manage, memory_read/write)
  → Visualize it? Open Clawpilot

Do you want to simulate or run a team of agents with formal structure, budgets, and approvals?
  → YES: Use ATV-Teams
  → Setup a company, create agents, define goals, monitor from the dashboard

Do you want agents to discover each other and delegate peer-to-peer in a shared workspace?
  → YES: Use Chamber
  → Create minds, set up a chatroom, enable A2A messages and task handoff

Do you want to code or chat with Copilot directly?
  → YES: Use GitHub Copilot CLI or your IDE
  → Clawpilot, Rugger, Chamber, and ATV-Teams all abstract over this

What's WorkPilot?
  → UNKNOWN: Cannot determine from available sources. Flag for clarification.
```

---

## SECTION 5: Example Use Case for ATV-Teams

### Scenario: Nick Orchestrates a Multi-Agent AI Software Squad

**Goal:** "Ship a new feature for an open-source library in 4 weeks, on schedule and within a token budget."

**The Team:**
- **Alex (CEO/Architect)** — GitHub Copilot CLI agent. Reviews strategy, proposes the plan, decomposes the feature into tasks, and checks in daily.
- **Casey (Lead Engineer)** — Claude Code agent. Implements features, writes tests, handles code review feedback.
- **Dana (QA/Reviewer)** — Codex agent. Tests features, runs checks, and approves PRs before they merge.
- **Ellis (Docs)** — Process-style agent. Runs a script that generates API docs, examples, and release notes.

**Budget:** $200/month total; $60 for Alex, $80 for Casey, $40 for Dana, $20 for Ellis.

### Step-by-Step: How You'd Use ATV-Teams

#### Week 1: Setup

1. **Create a company** in ATV-Teams: "OSSLib v2 Feature"
   - Goal: "Ship new feature in 4 weeks, on schedule and within budget"

2. **Create the org chart** — hire agents:
   - Alex (CEO) — adapter: GitHub Copilot CLI
   - Casey (Engineer) — adapter: Claude Code
   - Dana (QA) — adapter: Codex
   - Ellis (Docs) — adapter: process (shell script)
   - Set monthly budgets: Alex $60, Casey $80, Dana $40, Ellis $20

3. **Define the goal hierarchy:**
   - Company goal: "Ship new feature in 4 weeks"
     - Sub-goal: "Design and review the architecture"
     - Sub-goal: "Implement core functionality"
     - Sub-goal: "Write tests and QA"
     - Sub-goal: "Write and deploy docs"

4. **Assign initial tasks:**
   - Alex: "Propose the architecture plan" (assigned to CEO)
   - Once approved (board approval gate), decompose into:
     - Casey: "Implement the core module"
     - Dana: "Write tests for the core module"
     - Ellis: "Generate API docs"

5. **Set heartbeat schedules:**
   - Alex: Daily at 9 AM (strategic check-in)
   - Casey: Every 4 hours (frequent coding bursts)
   - Dana: Daily at 5 PM (after Casey's work)
   - Ellis: Weekly Friday 4 PM (doc generation)

#### Week 1-2: Execution

6. **Hit "Go"** — agents start their heartbeat schedule
   - Alex wakes, reads: "Propose the architecture plan" is assigned. Drafts a plan, attaches a design doc, comments with reasoning, waits for board approval.
   - You (board) review Alex's plan in the dashboard. It looks good. Click "Approve."
   - Alex's next heartbeat sees the approval and decomposes the plan into engineering tasks. Assigns: Casey → implement core, Dana → test core.

7. **Monitor from the dashboard:**
   - Casey's heartbeat fires. She sees her task ("Implement the core module"), works for 2 hours (within her adapter's session time), commits code, and reports "50% done, blocked on review from Dana."
   - Dashboard shows: Casey's task is `in_progress`; token spend so far: $12 (out of $80 budget).
   - Dana's daily heartbeat fires (5 PM). She sees Casey's work, runs tests, finds 2 bugs, comments with failing test cases.
   - Casey's next heartbeat (8 PM) sees Dana's comments, fixes the bugs, re-runs tests.
   - Dana's next heartbeat (tomorrow 5 PM) sees the fixes are good, approves Casey's work, updates task to `done`, and moves to the next task.

8. **Cost tracking:**
   - Dashboard shows cumulative token spend: Company $45 / $200 budget (22.5% used), 10 days in.
   - Alex has used $8 / $60; Casey has used $25 / $80; Dana $10 / $40; Ellis $2 / $20.
   - You can adjust budgets mid-sprint if needed. If Casey hits her $80 limit early, ATV-Teams auto-pauses her tasks; you can approve an override or add more budget.

9. **Blockers & Governance:**
   - Week 2: Casey's task hits a blocker: "Need architectural decision on error handling." Task marked `blocked_on: Alex's task X`.
   - Alex's next heartbeat sees the blocker, reviews the decision, makes a call, comments, and unblocks.
   - You (board) can override any agent decision at any time by commenting on the task.

#### Week 3-4: Closing

10. **Approvals & Handoff:**
    - By day 21, all core tasks are `done`. Ellis's weekly doc job runs, generates release notes, commits to the repo.
    - You do a final review: check costs (total $187 / $200), check that all work products are in place, and approve the release.
    - Casey runs the final merge-and-tag heartbeat. Feature is shipped.

11. **Post-Mortem:**
    - Dashboard shows: 28 days, 4 agents, 12 tasks completed, $187 spent, 0 runaway costs, 100% uptime.
    - Activity log is immutable; every agent decision, every approval, every cost event is auditable.

---

### Why ATV-Teams for This

- ✅ **Formal org structure** — roles and reporting lines let agents know their responsibilities
- ✅ **Goal alignment** — every task traces back to "Ship new feature"; agents stay on-mission
- ✅ **Budget discipline** — $200 total budget; you can see spend in real-time; no surprises
- ✅ **Approval gates** — you can review architecture before implementation, or override any decision
- ✅ **Heartbeat scheduling** — agents run on your schedule, not ad-hoc; predictable cost burn
- ✅ **Blocker tracking** — dependencies surface automatically; you know when work is stuck
- ✅ **Audit trail** — every decision, every cost event, every approval is recorded
- ✅ **Scalable** — same control plane runs a 4-agent project or a 40-agent company

### Contrast with Rugger

In Rugger, you would:
- Manually spawn each agent: `spawn_sub_agent(role='engineer', objective='implement core')`
- Manage memory yourself: `memory_write('project status', new_content)`
- Track progress manually: `task_manage('list')` and scan for updates
- Handle budgets outside the system (reminder: watch token usage)
- No formal approval gates; agents just work until you tell them to stop

Rugger is more *ad-hoc* and *personal*. ATV-Teams is more *structured* and *governable* — which is what you need when you're running a team, not just delegating to helpers.

---

## Conclusion

| Aspect | Rugger | ATV-Teams | Recommendation |
|--------|--------|-----------|-----------------|
| **Your Current Stack** | Core system; essential for your daily work | Complementary; for team simulation and AI-native business prototyping | Keep using Rugger; experiment with ATV-Teams when you want formal governance |
| **Long-Term Integration** | Keep as personal orchestrator | Could become a task backend or multi-user extension | Use them in parallel; consider custom adapter if you want Rugger agents to report into ATV-Teams |
| **Learning Investment** | Minimal; you know it | Moderate; control plane concepts, org structure, heartbeats | Worth understanding for AI-native team design; not necessary to replace Rugger |
| **Next Step** | N/A | Spin up local ATV-Teams (`pnpm dev`), create a test company, try a 2-agent simulation | Start with: create company → hire 2 agents → define tasks → set heartbeat schedule → watch them work |

---

## Open Questions & Flagged Items

1. **WorkPilot identity — RESOLVED (2026-06-14).** `gim-home/WorkPilot` is a **Microsoft INTERNAL** repo (anonymous lookups 404; authenticated `gh` confirms it). It's an autonomous M365 AI assistant, installed and **running locally** on Nick's box (`workpilot.exe serve`, localhost:3003, Edge PWA, auto-starts at login). It is Rugger's closest sibling — see the WorkPilot rows in the matrix above for the full clinical comparison.

2. **ATV-Teams <→ Rugger integration not built** — They are complementary but separate today. A custom adapter could bridge them; not implemented.

3. **Chamber vs. ATV-Teams positioning** — Both target multi-agent coordination; Chamber emphasizes A2A peer collaboration, ATV-Teams emphasizes governance and goal alignment. Try both to see which fits your thinking.

4. **Deployment & self-hosting** — ATV-Teams is self-hostable; Rugger runs local-only. For a team scenario, you'd need to host ATV-Teams somewhere (local server, remote, or managed).

---

**Document Generated:** June 14, 2026  
**Briefing Author:** Researcher Agent (verified from source repos)  
**Status:** Ready for Nick's review and experimentation
