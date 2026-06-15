# NICK's AI Assistant Operators' Guide

**A Practical Field Manual for Six Tools in Your Stack**

---

## Quick Start: Which Tool Should I Use?

If you're in a hurry, jump to the [Decision Guide](#decision-guide-which-tool-for-your-scenario) at the end. Otherwise, read each tool's section in order.

---

## 1. Rugger (WorkClaw)

### What It Is

Rugger is your personal AI agent orchestrator and conductor. It runs locally on your machine via the GitHub Copilot CLI as a transport layer. You spawn specialized sub-agents dynamically, delegate work to them, track their progress, and maintain a persistent memory system (topic graphs, structured facts, daily logs) that survives reboots. Think of it as a "workspace for sub-agents" — a place where you direct specialist AI agents to accomplish tasks on your behalf.

**In one sentence:** Rugger is a personal agent dispatcher with persistent memory and asynchronous delegation, designed for *you* to orchestrate specialists who help accomplish goals.

### Key Features

- **Sub-agent spawning:** Use `spawn_sub_agent()` to create temporary agents with specific roles (researcher, developer, security analyst, writer, architect, qa). Agents are created on-demand and can be customized.
- **Persistent memory:** Plain-text memory files organized by topic (topic graph). Also supports structured memory for people, projects, preferences, and facts. Daily logs persist across sessions.
- **Asynchronous delegation:** Spawn an agent to do research, come back later to check results via `task_manage()`.
- **Scheduled jobs:** Use `schedule_manage()` to set recurring tasks (daily, weekly, monthly, hourly). Jobs run headlessly; results log to the Work-Claw daily log.
- **Task tracking:** `task_manage()` tool provides ticket-style task creation, listing, updates, and completion with result summaries.
- **Channel routing:** Tasks can be scoped to channels (e.g., 'work-claw', 'general') for organizational structure.
- **Skill system:** Custom skills can be bundled and invoked by sub-agents.
- **No built-in governance:** Agents run when you spawn them or on schedule you define. No budget enforcement, approval gates, or risk scoring by default.

### How to Start / Access It

1. **Prerequisites:**
   - GitHub Copilot CLI installed and authenticated
   - Rugger is already running as a daemon (it auto-starts or can be invoked from your terminal)

2. **Primary interface: Clawpilot** (the Electron desktop shell)
   - Installed at: `C:\Program Files (x86)\Clawpilot\` (or via your custom build in `cpilot\release\`)
   - Launch: Click the Clawpilot icon on your taskbar or desktop
   - Displays: Channels, memory topics, task queue, agent spawning UI
   - Use to browse your tasks and memory visually

3. **Programmatic access: In Rugger conversations** (via Copilot CLI chat)
   - You have direct access to: `spawn_sub_agent()`, `task_manage()`, `schedule_manage()`, `memory_read()`, `memory_write()`, `structured_memory()` tools
   - Use these in conversation to orchestrate work

4. **Command-line (if applicable):**
   - Some workflows may be driven via bash/PowerShell + Copilot CLI; verify with your local setup

### Core Day-to-Day Usage

#### Spawning an agent for a one-off task

```
You: "I need to research Azure OpenAI service limits. Can you spawn a researcher agent to dig into this?"

Rugger: [Spawns a researcher agent with objective to gather OpenAI service limits]

Later, you:
"What did the researcher find on Azure OpenAI limits?"

Rugger: [Reports back results from the researcher; you can choose to keep the agent running or close it]
```

#### Creating a recurring scheduled job

```
You: "Create a daily scheduled job that runs every morning at 8 AM. 
      The job should have a developer agent review open PRs in our repo and summarize status."

Rugger: schedule_manage(
  action='create',
  name='Daily PR Review',
  frequency='daily',
  time='08:00',
  agent_role='developer',
  objective='Review open PRs in the repo and summarize status in a comment'
)
```

#### Managing tasks

```
You: "Create a task: Research best practices for fine-tuning GPT models. 
      Assign it to the researcher role."

Rugger: task_manage(
  action='create',
  title='Research fine-tuning best practices',
  description='Investigate latest research on fine-tuning GPT models for specific domains',
  priority='high',
  role='researcher'
)

Later:
You: "List my tasks in backlog or assigned status"

Rugger: [Shows all tasks matching filter; you can update, complete, or reassign]
```

#### Reading and writing memory

```
You: "What facts do I have about Azure SDK performance?"

Rugger: memory_read(file='topic:azure-sdk-perf')
[Returns prose facts and any structure data on that topic]

You: "Update my memory: Azure SDK v2 now supports async/await for all services."

Rugger: memory_write(
  file='topic:azure-sdk-perf',
  content='Azure SDK v2 now supports async/await for all services (confirmed 2026-06-14).',
  mode='append'
)
```

#### Structured memory (for relationships, projects, preferences)

```
You: "Add a preference: I prefer Claude models for writing over GPT."

Rugger: structured_memory(
  action='upsert_preference',
  pref_key='model_for_writing',
  pref_value='Claude',
  pref_source='explicit',
  pref_confidence='high'
)
```

### When to Reach for Rugger vs. Other Tools

**Use Rugger when:**
- You are the primary actor and need specialist agents to help *you* accomplish a task
- You want persistent memory across sessions (topics, structured facts, daily logs)
- You need asynchronous delegation ("I'll ask an agent to research X; I'll check back later")
- You're working solo or with a small team where you're the central coordinator
- You want full control and customization of the orchestration layer

**Don't use Rugger when:**
- You want to simulate or run a team of agents with formal governance and budgets (use ATV-Teams)
- You want agents to discover and coordinate peer-to-peer (use Chamber)
- You want official, security-gated autonomous execution with Teams integration (use WorkPilot)

### Gotchas / Limitations

1. **No budget enforcement:** Agents can run indefinitely and consume tokens until you stop them. You must manually monitor token usage.
2. **No approval gates:** Agents execute immediately when spawned or on schedule. There is no "timed approval" or "human review before execution" workflow built in.
3. **Single-user only:** Rugger is designed for *you* (one user) to orchestrate agents. It's not a multi-user team control plane.
4. **Manual memory management:** You must explicitly `memory_write()` to persist state. If you forget, context doesn't carry forward to the next session.
5. **Spawned agents are temporary:** Sub-agents you spawn are created on-demand and don't have a "persistent agent identity" like ATV-Teams agents do. They run, complete their task, and are cleaned up.
6. **No formal org chart:** Rugger doesn't enforce reporting lines or titles. Agent relationships are informal.
7. **Transport dependency:** Rugger runs over GitHub Copilot CLI. If Copilot is down or authentication is broken, Rugger is inaccessible.

---

## 2. WorkPilot

### What It Is

WorkPilot is a **Microsoft-internal autonomous AI assistant** that runs locally on your machine (`localhost:3003` as an Edge PWA). It automatically learns from your history, extracts reusable skills, runs scheduled jobs in plain language, and delegates work to Claude Code or GitHub Copilot in the background. Critically, WorkPilot includes **governance features** that Rugger does not: 0–10 risk scoring, approval cards pushed to Microsoft Teams, a global E-Stop button, credential leak scanning, and command/path sandboxing. WorkPilot is powered by GPT-5.5 + Claude Opus 4.8 and is Rugger's closest sibling in your entire stack.

**In one sentence:** WorkPilot is a Microsoft-internal autonomous assistant with heartbeat learning, skill extraction, plain-text memory, and security-gated governance — essentially Rugger with built-in risk scoring and Teams approval workflows.

### Key Features

- **Heartbeat learning:** Automatically learns from your work history, extracts patterns, and discovers reusable skills
- **Skills extraction:** Autonomously converts repeated workflows into reusable skills (e.g., "generate daily report" becomes a skill callable from any job)
- **Scheduled jobs in plain language:** Define recurring jobs like "Every Monday at 9 AM, summarize last week's progress" without configuration files
- **Background delegation:** Can hand off work to Claude Code or GitHub Copilot; monitors and reports back
- **Plain-text memory:** Your memory is stored as plain text (like Rugger) — you can read, edit, delete it directly
- **Governance layer:**
  - **0–10 risk scoring** for every action (0 = fully auto-executable, 10 = blocked unless human approves)
  - **Approval cards** pushed to your Microsoft Teams client
  - **Two-stage approval:** Timed auto-approve (e.g., "approve if no response in 30 min") or human approval required
  - **Global E-Stop:** One button to pause all WorkPilot execution
  - **Credential leak scanning:** Detects and prevents accidentally using real credentials in commands
  - **Command/path sandboxing:** Restricts which commands and paths agents can access
- **Models:** GPT-5.5 primary, Claude Opus 4.8 for fallback/backup
- **Access:** Runs as localhost:3003 Edge PWA; auto-starts at login via `workpilot-serve.vbs`
- **Installed:** `C:\Users\[YourUser]\.local\bin\workpilot.exe serve` (installed 2026-06-03 on your machine)

### How to Start / Access It

1. **Auto-start:**
   - WorkPilot starts automatically at login via a Windows Startup shortcut (`workpilot-serve.vbs`)
   - Runs as a daemon on `localhost:3003`

2. **Manual start (if not auto-started):**
   ```bash
   C:\Users\[YourUser]\.local\bin\workpilot.exe serve
   ```
   Then open in Edge: `http://localhost:3003/#/chat`

3. **Primary interface:**
   - Open Edge or any browser
   - Navigate to: `http://localhost:3003/#/chat`
   - You're in the web-based chat UI

4. **Access Teams integration:**
   - Approval cards appear in your Microsoft Teams client
   - Click "Approve" or "Deny" on the card; action flows back to WorkPilot
   - E-Stop button is also accessible from Teams

### Core Day-to-Day Usage

#### Asking WorkPilot to do something

```
You: "Summarize the status of my current projects."

WorkPilot: 
  [Scans your work history]
  "Based on your recent activities, here are the key projects...
   I'm scoring this as a 2 (low risk) — just analyzing history, no actions needed.
   Executing now..."
  [Returns summary]
```

#### Creating a scheduled job in plain language

```
You: "Create a job: Every Monday morning at 9 AM, summarize what I accomplished last week and what's planned for this week."

WorkPilot:
  [Extracts pattern]
  "I'll create a recurring job for Mondays at 09:00.
   Action: Analyze last week's activity log + read your current task list.
   Risk score: 3 (reading your data, no write actions).
   Executing..."
  [Job is now scheduled]

Every Monday at 9 AM:
WorkPilot: "Good morning! Here's last week's summary and this week's plan..."
[Also posts summary to Teams]
```

#### Delegating work with approval

```
You: "I need you to draft a response email to a customer about product roadmap. 
      Run it by me on Teams before sending."

WorkPilot:
  [Drafts email]
  "I've drafted a response (risk score: 6 — writing external communication).
   Approval card posted to your Teams. Review and approve within 5 minutes or I'll ask again.
   [Pushes approval card to Teams]

You open Teams:
  [Card shows draft email]
  You click "Approve" → WorkPilot: "Confirmed. Sending now..."
  
OR

  You click "Deny" or don't respond → WorkPilot: "Awaiting your approval. Re-posting card..."
```

#### Extracting a reusable skill

```
You: (After WorkPilot has learned you run a "build and test" workflow daily)

WorkPilot:
  "I've noticed you run a 'build and test' sequence every morning.
   I've extracted it as a reusable skill: 'daily_build_and_test'.
   Future jobs can call this skill directly. Shall I use it for tomorrow's schedule?"
```

#### Checking memory

```
You: "What do you know about my current priorities?"

WorkPilot: memory_read()
[Returns plain-text memory file of your priorities, facts, and history]

You: "Update my memory: I'm shifting focus to improve API latency."

WorkPilot: memory_write(
  content='Shifting focus to API latency improvements (2026-06-14).',
  mode='append'
)
```

### When to Reach for WorkPilot vs. Other Tools

**Use WorkPilot when:**
- You want autonomous execution with security-gated approval workflows
- You need governance (risk scoring, approval cards, E-Stop, credential scanning)
- You want to work through Microsoft Teams (approvals appear there)
- You want automatic skill extraction from patterns
- You want scheduled jobs defined in plain language (no config files)
- You want Microsoft-sanctioned, auditable automation with credential protection

**Don't use WorkPilot when:**
- You need to spawn ad-hoc specialist agents for one-off tasks (use Rugger instead)
- You want to simulate a multi-agent team with formal org structure (use ATV-Teams)
- You want full customization and hackability of the orchestration layer (use Rugger)

**WorkPilot vs. Rugger:**
- **WorkPilot** = official, security-gated, Teams-native, less customizable
- **Rugger** = local, hackable, fully under your control, no governance by default
- Use **both** in parallel: Rugger for day-to-day agent work; WorkPilot for autonomous, governed background tasks that need approval in Teams

### Gotchas / Limitations

1. **Microsoft-internal only:** WorkPilot is not available outside Microsoft. If you leave Microsoft, you lose access.
2. **Teams dependency:** Full governance workflow (approval cards, E-Stop) requires Microsoft Teams to be running.
3. **Localhost-only by default:** WorkPilot runs on `localhost:3003`. Accessing it from another machine requires extra configuration (not covered here; TBD).
4. **Memory privacy:** Plain-text memory is on your machine; if credentials leak into memory, WorkPilot's scanning will catch it, but review permissions carefully.
5. **Skill extraction is automatic:** WorkPilot learns from your history; if you do something you don't want repeated, monitor the extracted skills.
6. **Risk scoring is opinionated:** WorkPilot's 0–10 risk model is pre-configured by Microsoft. You can override approvals, but you can't change the scoring system (TBD if customization is available).

---

## 3. GitHub Copilot CLI

### What It Is

GitHub Copilot CLI is the foundational AI runtime in your stack. It's a command-line tool that gives you access to Copilot chat, code completion, and agent capabilities from the terminal. For Rugger, Copilot CLI serves as the **transport layer** — Rugger runs over Copilot CLI to invoke agents and carry messages. You can use Copilot CLI directly for coding, terminal automation, and chat, but in your daily workflow, it's usually accessed through higher-level tools (Rugger, Clawpilot, Chamber, ATV-Teams).

**In one sentence:** Copilot CLI is the underlying AI engine and message transport for all agent systems in your stack; you can use it directly, but mostly it's the plumbing under other tools.

### Key Features

- **Terminal chat:** `copilot` command opens an interactive chat session with Copilot in the terminal
- **Code completion:** IDE integration (VS Code, JetBrains, etc.) for inline code suggestions
- **Explanation & fix:** Ask Copilot to explain code or suggest fixes inline
- **Shell command generation:** Describe what you want in English; Copilot suggests shell commands
- **Transport layer:** Rugger, Chamber, and other agents use Copilot CLI under the hood to execute and communicate
- **Agent SDK:** Copilot CLI exposes APIs for building agents (`@github/copilot` SDK)
- **Stateless by default:** Each chat session is independent unless you explicitly load context

### How to Start / Access It

1. **Prerequisites:**
   - GitHub Copilot subscription (not free)
   - GitHub CLI (`gh`) installed and authenticated
   - Copilot CLI extension installed for `gh`

2. **Start a chat session:**
   ```bash
   copilot
   ```
   Opens interactive chat in your terminal.

3. **Use in a single command:**
   ```bash
   gh copilot explain "what does this Python code do?"
   ```

4. **IDE integration:**
   - Install GitHub Copilot extension in VS Code, JetBrains, etc.
   - Inline suggestions appear as you type; use Cmd+K (Mac) or Ctrl+K (Windows) to open Copilot chat in the editor

### Core Day-to-Day Usage

#### Direct chat in the terminal

```bash
$ copilot
 
> Generate a Python script that reads a CSV file and prints the average of column 3.

[Copilot responds with a Python script]

> Improve it to handle missing values

[Copilot refines the script]

> Exit

$ [Script is saved or you can copy-paste it]
```

#### Shell command generation

```bash
$ copilot
 
> List all files in the current directory that were modified in the last 7 days, sorted by modification time.

Copilot: find . -mtime -7 -type f -printf '%T+ %p\n' | sort

> Yes, run that

[Command executes and shows results]
```

#### Code explanation

```bash
$ gh copilot explain "async function fetchData() { const res = await fetch('...'); return res.json(); }"

Copilot: This async function fetches data from a URL and returns the parsed JSON response...
```

#### In Rugger conversations

When you talk to Rugger, you're implicitly using Copilot CLI:

```
You: "Spawn a researcher agent to find the latest Kubernetes security advisories."

[Rugger uses Copilot CLI to invoke the researcher agent]

Researcher Agent: [Runs under Copilot CLI transport, reports back findings]
```

### When to Reach for Copilot CLI vs. Other Tools

**Use Copilot CLI directly when:**
- You need quick terminal chat or code explanation
- You want lightweight shell command generation without spawning an agent
- You're scripting or automating without needing persistent context

**Don't use Copilot CLI directly when:**
- You need an agent with persistent memory and task tracking (use Rugger)
- You want a team orchestration control plane (use ATV-Teams)
- You want desktop UI with visual browsing (use Clawpilot or Chamber)

### Gotchas / Limitations

1. **Stateless by default:** Each Copilot CLI chat session starts fresh. You must explicitly load context from files or memory.
2. **Token-based cost:** Every chat, every completion, every API call costs tokens. No built-in budget enforcement.
3. **Authentication required:** You must stay authenticated to GitHub. If your token expires, Copilot CLI stops working.
4. **No persistent task tracking:** Copilot CLI doesn't have a task queue or project memory. Use Rugger for that.
5. **Raw terminal interaction:** No visual UI; all interaction is text-based. For browsing results, you typically need to redirect output to files or use a higher-level tool.

---

## 4. ClawPilot

### What It Is

ClawPilot is a desktop Electron application that serves as the visual shell for Rugger. It provides a graphical interface to browse channels, memory topics, task queue, and spawn sub-agents. ClawPilot makes Rugger's capabilities accessible without requiring you to type Rugger tool calls in Copilot chat; instead, you can click through a GUI. It's installed as a custom build in your environment (`C:\Program Files (x86)\Clawpilot\` or `cpilot\release\`).

**In one sentence:** ClawPilot is the desktop UI for Rugger — a visual way to browse channels, memory, tasks, and spawn agents without typing commands.

### Key Features

- **Channel browser:** Visual sidebar listing all your Rugger channels (e.g., 'work-claw', 'general', project-specific channels)
- **Memory topic browser:** Browse and search your Rugger memory topics by name
- **Task queue UI:** View tasks in backlog, assigned, in-progress, blocked, and done states
- **Agent spawning UI:** Form-based interface to spawn sub-agents with role, objective, and context
- **Progress tracking:** Visual display of spawned agents' progress as they work
- **Terminal-like feel:** Retains some text-based interaction but with visual organization
- **Local-only:** Runs on your machine; no cloud sync or remote access
- **Theme support:** May support light/dark mode (verify with your build)

### How to Start / Access It

1. **Launch ClawPilot:**
   - Click the Clawpilot icon on your taskbar or desktop
   - Or navigate to: `C:\Program Files (x86)\Clawpilot\` and double-click the `.exe`
   - Or from the command line:
     ```bash
     clawpilot  # if in PATH
     # or
     C:\Program Files (x86)\Clawpilot\clawpilot.exe
     ```

2. **Interface appears:**
   - Left sidebar: Channels
   - Center: Selected channel content or task list
   - Right panel: Memory topics, agent spawning, or task details

3. **First time:**
   - It may prompt you to authenticate with GitHub or connect to Rugger daemon
   - Ensure Rugger is running (it's a background daemon that starts automatically or can be started explicitly)

### Core Day-to-Day Usage

#### Browsing channels and tasks

```
1. Open ClawPilot
2. Left sidebar shows channels (work-claw, general, project-foo)
3. Click a channel → center pane shows recent messages, task updates, agent reports
4. Scroll to see task history
```

#### Viewing a specific task

```
1. Look for a task in the center pane (or search if available)
2. Click the task → right pane shows:
   - Title, description, assignee
   - Status (backlog, assigned, in_progress, blocked, done)
   - Comments and updates
   - Child tasks (if hierarchical)
3. Click "Update" or "Complete" button to change status
```

#### Spawning an agent from the UI

```
1. Right-click on a channel or click the "+ Spawn Agent" button
2. Form appears:
   - Role: (dropdown: researcher, developer, qa, writer, architect, security_analyst)
   - Objective: (text field: what should the agent do?)
   - Context: (optional; rich context for the agent)
   - Channel: (which channel to log results to)
3. Click "Spawn"
4. Agent starts; progress bar appears in the right pane
5. As agent works, updates flow in; click to see details
```

#### Browsing memory topics

```
1. Right sidebar (or dedicated tab) shows memory topics
2. Search or scroll to find a topic (e.g., "azure-sdk-perf")
3. Click it → displays the topic's content (prose + structured facts)
4. Some topics may allow inline editing (if ClawPilot supports that; TBD)
```

### When to Reach for ClawPilot vs. Other Tools

**Use ClawPilot when:**
- You want a visual, clickable interface for Rugger
- You prefer not to type tool calls in Copilot chat
- You want to browse channels, tasks, and memory visually
- You're managing multiple agents and want to see status at a glance

**Don't use ClawPilot when:**
- You want to run ATV-Teams (use the React web dashboard instead)
- You want to chat with agents directly (use Copilot CLI or Rugger conversation)
- You want agent-to-agent coordination (use Chamber)

### Gotchas / Limitations

1. **Requires Rugger daemon:** ClawPilot is only a UI; it requires the Rugger daemon to be running in the background.
2. **Local-only:** ClawPilot runs on your machine. No remote or mobile access.
3. **Not a real-time dashboard:** Updates may not be instant; you may need to refresh or re-click to see latest state.
4. **Limited to Rugger capabilities:** ClawPilot cannot spawn ATV-Teams agents or Chamber minds. It's Rugger-specific.
5. **Custom build required:** Your installation is a custom build (`cpilot\release\`). It may not have the latest features from the upstream project.

---

## 5. ATV-Teams

### What It Is

ATV-Teams is a **control plane for human-directed AI teams**. It's a Node.js server + React web UI that lets you (or a small board) conduct a fleet of AI agents toward a common goal. Instead of manually spawning agents, you define an organization (org chart, roles, budgets, and reporting lines), create agents via adapters (GitHub Copilot, Claude Code, Codex, process, HTTP webhook, etc.), set company goals, and let agents work on tasks on a heartbeat schedule. You stay in the loop via a dashboard where you can approve decisions, override strategy, and track costs. ATV-Teams is ideal for simulating AI-native businesses, managing multi-agent teams, and governance-heavy projects.

**In one sentence:** ATV-Teams is a formal control plane for teams of AI agents with org charts, budgets, goal alignment, and approval workflows — like a CRM or project manager for AI agents.

### Key Features

- **Org chart & agents:** Define a formal organizational structure with roles, reporting lines, job titles, and agent identities. Hire agents via adapters (GitHub Copilot, Claude Code, Codex, Cursor, process, HTTP webhook, OpenClaw gateway, etc.).
- **Goal hierarchy:** Company goal → sub-goals → tasks. Every task traces back to the company mission.
- **Task management:** Ticket-based system with single assignee per task, atomic checkout (no double-work), parent/child hierarchy, blockers, status tracking, and comments.
- **Heartbeats:** On a schedule (daily, hourly, custom), agents wake, check their task queue, pick the highest-priority task, work until done or blocked, and report results. Next heartbeat, they resume.
- **Budget enforcement:** Monthly per-agent budget in tokens/costs. When an agent hits their budget, tasks auto-pause. You can override or allocate more budget.
- **Cost tracking:** Real-time visibility into token spend, cost per agent, cost per company, and runway.
- **Board approvals:** You (or board members) can review agent proposals, override decisions, hire/fire agents, and pause/terminate any work.
- **Multi-company isolation:** One ATV-Teams deployment can run multiple companies (clients, projects) with complete data isolation.
- **Persistent state:** Database-backed (PostgreSQL or embedded PGlite in dev). Tasks, agents, and results survive reboots.
- **Portable orgs:** Export/import org structures, agents, and skills with secret scrubbing.
- **Audit log:** Immutable log of every decision, every approval, every cost event.

### How to Start / Access It

1. **Prerequisites:**
   - Node.js 18+ and pnpm installed
   - Repo: `C:\Dev-bin\my-Github-Repos\ATV-Teams\`
   - PostgreSQL (optional; uses embedded PGlite in dev if `DATABASE_URL` is not set)

2. **Install and run:**
   ```bash
   cd C:\Dev-bin\my-Github-Repos\ATV-Teams\
   pnpm install
   pnpm dev
   ```
   This starts:
   - API server: `http://localhost:3100`
   - UI: `http://localhost:3100` (served by the same server)

3. **First time:**
   - Open: `http://localhost:3100` in your browser
   - Create a company (or use the demo company if one exists)
   - UI guides you through creating agents and tasks

4. **For production / remote access:**
   - Set `DATABASE_URL` to a real PostgreSQL instance
   - Deploy the server to a machine accessible from your network
   - Open the UI from any machine on the network

### Core Day-to-Day Usage

#### Creating a company and org chart

```
Step 1: Dashboard → "Create Company"
  - Name: "OSSLib v2 Feature"
  - Goal: "Ship new feature in 4 weeks, on schedule and within budget"
  - Save

Step 2: "Hire Agents"
  - Alex (CEO): adapter = GitHub Copilot, budget = $60/month
  - Casey (Engineer): adapter = Claude Code, budget = $80/month
  - Dana (QA): adapter = Codex, budget = $40/month
  - Ellis (Docs): adapter = process, budget = $20/month

Step 3: "Define Org Chart"
  - CEO: Alex (reports to: nobody; direct reports: Casey, Dana, Ellis)
  - Engineer: Casey (reports to: Alex)
  - QA: Dana (reports to: Alex)
  - Docs: Ellis (reports to: Alex)

Step 4: "Set Budgets" (if not already done in hire step)
  - Company budget: $200/month total
  - View dashboard; costs are tracked real-time

Save.
```

#### Creating tasks and setting goal hierarchy

```
Step 1: "Create Goal"
  - Parent: Company goal "Ship new feature"
  - Sub-goal 1: "Design and review architecture"
  - Sub-goal 2: "Implement core functionality"
  - Sub-goal 3: "Test and QA"
  - Sub-goal 4: "Write and deploy docs"

Step 2: "Create Task"
  - Title: "Propose the architecture plan"
  - Assigned to: Alex (CEO)
  - Parent goal: "Design and review architecture"
  - Priority: high
  - Status: backlog (agents will pick it up on their heartbeat)

Step 3: Save. Task is now in backlog, waiting for Alex's next heartbeat.
```

#### Running heartbeats and monitoring work

```
Step 1: "Set Heartbeat Schedules"
  - Alex (CEO): daily at 9 AM
  - Casey (Engineer): every 4 hours starting at 10 AM
  - Dana (QA): daily at 5 PM
  - Ellis (Docs): weekly Friday at 4 PM

Step 2: Click "Start Execution" (or heartbeats are already running if auto-start is enabled)

Step 3: Monitor from dashboard
  - Alex's first heartbeat (9 AM): "Propose the architecture plan" task is assigned to her.
    Alex reads the task, thinks about the architecture, drafts a plan, and comments:
    "Here's my proposal: [design doc]. This is a 2-week architecture phase. Awaiting approval."
    Task status: in_progress. Awaiting board approval.

Step 4: You (board) review Alex's proposal in the task comment. It looks good.
  - You click "Approve" on the task.

Step 5: Alex's next heartbeat (next day, 9 AM): She sees the approval.
  Decomposes the architecture into engineering tasks:
  - "Implement core module" → assigned to Casey
  - "Write tests for core" → assigned to Dana
  - "Generate API docs" → assigned to Ellis
  Task updates: "Architecture approved. Engineering tasks created."

Step 6: Casey's next heartbeat (4 hours later, 2 PM):
  - Picks up "Implement core module" task
  - Works for 2 hours (within her adapter's session time)
  - Commits code to the repo
  - Comments: "50% done. Core module structure in place. Blocked on review from Dana."
  - Task status: in_progress

Step 7: Dashboard shows real-time cost:
  - Company: $45 / $200 (22.5% spent, 10 days in)
  - Casey's spend: $12 / $80
  - Runway: on track

Step 8: Dana's heartbeat (5 PM):
  - Reads Casey's code and tests
  - Finds 2 failing tests
  - Comments: "Found 2 issues: [test case 1], [test case 2]"
  - Task status: blocked (waiting for Casey to fix)

Step 9: Casey's next heartbeat (8 PM):
  - Sees Dana's comments
  - Fixes the bugs
  - Re-runs tests
  - Comments: "Issues fixed. Tests passing."
  - Task status: in_progress again

Step 10: Dana's next heartbeat (next day, 5 PM):
  - Sees Casey's fixes
  - Runs final tests
  - All pass
  - Comments: "✅ Approved. Core module ready."
  - Task status: done

Repeat for remaining tasks...

Step 11: After 4 weeks:
  - All tasks done
  - Cost tracking shows $187 / $200 spent
  - Activity log shows every decision, approval, and cost event
  - You do a final review and sign off on the release
```

#### Approving agent decisions

```
Task comment from Alex:
  "I'm proposing we refactor the error handling to use custom exceptions.
   This adds 2 days but improves maintainability. Board approval needed."

You open the task in the dashboard and see the proposal.

In the task comment section:
  - You type: "✅ Approved. Good call on error handling. Proceed."
  - System records your approval in the audit log

Alex's next heartbeat sees the approval and adds the refactoring to the plan.
```

#### Overriding an agent

```
You notice Casey's task is running long and using tokens fast.
You want to pause her work and redirect to Dana.

In Casey's task:
  - Click "Pause" (or comment "⏸ Pause this task")
  - Casey's next heartbeat sees the pause and stops work
  - Task status: blocked_by_board

In Dana's task:
  - Reassign: change assignee from nobody to Dana
  - Comment: "Casey's task paused. Please take over and verify the core module passes all tests."
  - Dana's next heartbeat picks up the new task
```

#### Checking costs

```
Dashboard → "Cost Tracking" tab:
  - Company budget: $200/month
  - Current spend: $187 (93.5%)
  - Burn rate: ~$6.70/day
  - Runway: 2 days remaining (at current burn)

Per-agent breakdown:
  - Alex: $8 / $60 (13%)
  - Casey: $120 / $80 (150% — OVER BUDGET, auto-paused)
  - Dana: $35 / $40 (87%)
  - Ellis: $24 / $20 (120% — OVER BUDGET, auto-paused)

Action: You click "Increase Ellis's budget to $30" → Ellis resumes work on next heartbeat.
```

### When to Reach for ATV-Teams vs. Other Tools

**Use ATV-Teams when:**
- You want to simulate or run an actual team of agents (CEO, engineers, designers, etc.)
- You need formal org structure, roles, and reporting lines
- Cost control and budget enforcement matter
- You want work tracked as persistent tasks with approval workflows
- You want to build a demo or prototype of an AI-native business
- You want multi-agent execution on a schedule (heartbeats) rather than manual invocation
- You need an audit log for compliance or oversight

**Don't use ATV-Teams when:**
- You're a solo user needing to spawn specialist agents (use Rugger instead)
- You want agent-to-agent peer collaboration (use Chamber)
- You don't need governance and just want to run agents quickly (use Rugger or GitHub Copilot CLI)
- You want a fully customizable orchestration layer (use Rugger)

### Gotchas / Limitations

1. **Org chart is formal:** Once you define the org structure, changing it requires board approval (governance by design). This is good for teams but constraining if you're iterating rapidly.
2. **Single-assignee task model:** Each task has exactly one assignee. You can't assign a task to a group or have multiple agents work on the same task in parallel (by design, to prevent double-work).
3. **Heartbeat-driven execution:** Agents only run on heartbeat schedule. If you need immediate execution, you have to manually kick off a heartbeat or wait for the next scheduled one.
4. **Limited to configured adapters:** Agents can only run via adapters you've set up (Copilot, Claude Code, Codex, etc.). You can't arbitrarily invoke a shell script or a custom binary (unless you set up a process or HTTP webhook adapter).
5. **Board model is 1-person by design in V1:** ATV-Teams UI supports 1 board member (you). Multi-user board governance is in the roadmap but not implemented yet.
6. **No chat interface:** ATV-Teams is task-centric, not chat-centric. Agents communicate via task comments, not a shared chatroom. For A2A chat, use Chamber instead.
7. **Self-hosted or local:** ATV-Teams is not a managed service. You have to run the server yourself (locally, on a VPS, or in a container). No free SaaS version.

---

## 6. Agency CLI & Agency Cowork (Not Covered in Detail)

### Status: TBD

**Agency CLI** is installed on your machine as an MCP (Model Context Protocol) / marketplace provider, but detailed usage and capabilities are **not documented in your primary source materials**. Same for **Agency Cowork** (the desktop app version).

**From the comparison matrix:** These tools are mentioned but not fully characterized in the NICK-ATV-Teams-vs-Rugger-and-assistant-matrix.md or README files you provided.

**Recommendation:** 
- If you're using Agency CLI regularly, file a ticket to add detailed documentation (what it does, when to use it, key commands)
- For now, treat it as a low-priority tool in your stack; Rugger, WorkPilot, and GitHub Copilot CLI handle most agent orchestration needs

**Gotchas / Limitations (placeholder):**
- TBD: What is the primary use case?
- TBD: How does it integrate with Rugger, ATV-Teams, or Chamber?
- TBD: Does it have governance, budgets, or approval workflows?

---

## Quick-Reference Comparison Table

| Dimension | Rugger | WorkPilot | GitHub Copilot CLI | ClawPilot | ATV-Teams | Agency CLI |
|-----------|--------|-----------|-------------------|-----------|-----------|-----------|
| **What It Is** | Sub-agent dispatcher + memory layer | Autonomous M365 assistant + governance | AI runtime + chat + transport | Rugger desktop UI | Team control plane | TBD |
| **Primary Use** | Personal agent orchestration | Autonomous tasks + approvals | Direct coding/chat | Browse Rugger visually | Team simulation + governance | TBD |
| **Local / Cloud** | Local daemon | Local daemon + Edge PWA | Local + IDE integration | Local Electron | Self-hosted server | TBD |
| **Persistence** | Memory topics + tasks + daily logs | Plain-text memory + skills + jobs | Stateless (unless you load context) | N/A (UI only) | PostgreSQL database | TBD |
| **Sub-agent Spawning** | ✅ Manual spawn + scheduled jobs | ✅ Auto-learn + skill extraction | ❌ No (transport only) | ✅ Via UI | ❌ No (adapter-based) | TBD |
| **Memory System** | ✅ Topic graph, structured memory | ✅ Plain-text + auto-learned skills | ❌ Stateless | ✅ Browser (Rugger) | ✅ Task comments + activity log | TBD |
| **Delegation** | ✅ Asynchronous (spawn, check later) | ✅ Background (Claude Code / Copilot) | ❌ N/A | ✅ Via Rugger | ✅ Heartbeat (agents pick tasks) | TBD |
| **Scheduling** | ✅ Recurring jobs (daily/weekly/etc.) | ✅ Plain-language jobs + auto-learn | ❌ N/A | ❌ N/A | ✅ Heartbeats on schedule | TBD |
| **Governance** | ❌ No (agents run as you say) | ✅ Risk scoring (0–10), approval cards, E-Stop, cred scanning | ❌ No | ❌ No | ✅ Board approvals, budget enforcement | TBD |
| **Org Chart** | ❌ Informal | ❌ No | ❌ No | ❌ No | ✅ Formal roles + reporting lines | TBD |
| **Budget/Cost Control** | ❌ Manual tracking only | ✅ Risk-based approvals (no hard budget limit; TBD) | ❌ No | ❌ No | ✅ Per-agent monthly budgets, auto-pause | TBD |
| **UI Surface** | Programmatic tools | Edge PWA (localhost:3003) + Teams cards | Terminal only | Electron desktop (browsing) | React web dashboard | TBD |
| **Multi-agent Scope** | Solo (you) + ad-hoc helpers | Solo (you) + background tasks | N/A (transport) | Solo (you) | Team (CEO, engineers, etc.) | TBD |
| **Primary Transport** | GitHub Copilot CLI | GPT-5.5 + Claude Opus 4.8 + delegation | CLI + IDE | N/A (UI) | REST API (calls adapters) | TBD |
| **Approval Workflow** | ❌ No | ✅ Teams approval cards, timed auto-approve | ❌ No | ❌ No | ✅ Board comments + task updates | TBD |
| **Learning / Auto-Skill** | ❌ No | ✅ Extracts reusable skills from history | ❌ No | ❌ No | ✅ Via plugins (TBD depth) | TBD |
| **When You're the Actor** | ✅ Primary use case | ✅ Background executor | ✅ Quick chat/coding | ✅ Visual browsing | ❌ Not primary (team focus) | TBD |
| **When Simulating a Team** | ❌ Not designed for this | ❌ No | ❌ No | ❌ No | ✅ Primary use case | TBD |
| **Risk** | ⚠️ No runaway budget control | ✅ Approval gates + sandboxing | ⚠️ Manual monitoring needed | ⚠️ Inherits from Rugger | ✅ Budget hard-stop + approvals | TBD |

---

## Decision Guide: Which Tool for Your Scenario?

### Scenario 1: I want to quickly ask Copilot to write some code.

**Best choice: GitHub Copilot CLI**

```
$ copilot
> Write a Python script that converts CSV to JSON.
[Copilot responds]
> Improve it to handle missing values.
```

**Secondary:** VS Code Copilot extension (IDE integration, inline suggestions)

---

### Scenario 2: I need a specialist agent to research something complex for me, and I'll check back in an hour.

**Best choice: Rugger**

```
You: "Spawn a researcher agent to investigate the latest Azure OpenAI pricing models and report back."

Rugger: [Spawns researcher on background]

[Do something else for an hour]

You: "What did the researcher find?"
Rugger: [Reports results; you can save to memory, spawn follow-up agents, or end the task]
```

**Secondary:** WorkPilot (if you want governance and Teams approval cards)

---

### Scenario 3: I want to automate a recurring task (e.g., "Every morning at 9 AM, summarize my tasks for the day").

**Best choice: Rugger (scheduled jobs)**

```
Rugger: schedule_manage(
  action='create',
  name='Daily standup',
  frequency='daily',
  time='09:00',
  agent_role='writer',
  objective='Summarize my task list and priorities for the day'
)
```

**Alternative:** WorkPilot (plain-language job creation + auto-skill extraction)

---

### Scenario 4: I want to delegate work to my agents with full visibility and budget enforcement, and I want approval cards in Teams.

**Best choice: WorkPilot**

```
WorkPilot: "Create a job: Every Monday at 9 AM, summarize project progress."
[Job is scheduled with risk scoring]
[Approval cards appear in Teams]
```

**Secondary:** Rugger (if you want more customization and don't need Teams integration)

---

### Scenario 5: I'm simulating an AI-native business with a CEO, engineers, designers, and a QA team. They need formal org structure, budgets, and approval workflows.

**Best choice: ATV-Teams**

```
1. Create company: "AI Startup Simulation"
2. Hire agents: CEO (Copilot), Lead Engineer (Claude Code), Designer (Codex), QA (Copilot)
3. Set budgets: $200/month total
4. Define org chart: CEO → Engineers & Designer; CEO → QA
5. Create tasks tied to company goal
6. Set heartbeat schedule (daily, hourly, etc.)
7. Monitor from dashboard
8. Approve/override agent decisions as needed
```

**Secondary:** Rugger (if you want to manage agents ad-hoc without formal structure)

---

### Scenario 6: I want agents to discover and coordinate peer-to-peer, with shared memory and agent-to-agent task handoff.

**Best choice: Chamber** (not detailed in this guide; see Chamber documentation)

**Note:** Chamber is A2A-first; use it when agents are **peers** rather than reporting to you (Rugger) or a formal org (ATV-Teams).

---

### Scenario 7: I want to browse my Rugger workspace visually — channels, memory, tasks, agent spawning — without typing commands.

**Best choice: ClawPilot**

```
1. Open ClawPilot
2. Browse channels on the left
3. Click a channel → see task history
4. Right-click to spawn a new agent
5. Watch progress in real-time
```

---

### Scenario 8: I'm coding and want inline code suggestions, explanations, and quick fixes from Copilot.

**Best choice: GitHub Copilot IDE Extension** (VS Code, JetBrains, etc.)

```
[Type code]
[Copilot suggests completions; press Tab to accept]
[Cmd+K / Ctrl+K to open inline chat]
> Explain this function
> Add error handling
```

**Fallback:** GitHub Copilot CLI (terminal-based)

---

### Scenario 9: I need to track progress on a multi-week project with multiple agents, formal budget constraints, and an audit log for compliance.

**Best choice: ATV-Teams**

```
1. Create company: "Project Name"
2. Hire agents with roles and budgets
3. Create hierarchical tasks
4. Set heartbeat schedule
5. Monitor costs and progress from dashboard
6. Review audit log at project end
```

---

### Scenario 10: I'm juggling multiple agents for different tasks and losing track of what's happening.

**Best choice: Rugger + ClawPilot**

```
Rugger: task_manage(action='list')  # See all tasks in one place
or
ClawPilot: Open UI → browse channels and task queues visually
```

**Alternative:** ATV-Teams (if you want formal structure and cost tracking)

---

### Decision Tree (Quick)

```
┌─ Are you coding or chatting directly with Copilot?
│  └─ YES: GitHub Copilot CLI or IDE extension
│
├─ Do you need to spawn specialist agents for one-off tasks?
│  └─ YES: Rugger (programmatic) or ClawPilot (visual)
│
├─ Do you want autonomous execution with Teams approval cards?
│  └─ YES: WorkPilot
│
├─ Do you want to simulate a team with org chart, budgets, and formal governance?
│  └─ YES: ATV-Teams
│
├─ Do you want to browse your Rugger workspace visually?
│  └─ YES: ClawPilot
│
└─ Do you want agents to discover and coordinate peer-to-peer?
   └─ YES: Chamber
```

---

## Summary: Your AI Assistant Stack Explained

**Layer 1: Coding & Chat (Foundation)**
- **GitHub Copilot CLI** — The bedrock runtime. Everything else is built on top of this.

**Layer 2: Personal Orchestration (Your Day-to-Day)**
- **Rugger** — Your agent dispatcher. Spawn specialists, delegate work, manage memory, schedule jobs.
- **WorkPilot** — Autonomous execution with governance. Approval cards in Teams, auto-learning, skill extraction.
- **ClawPilot** — Visual interface for Rugger. Desktop app to browse channels, memory, and spawn agents visually.

**Layer 3: Team & Governance (Simulation & Formal Structure)**
- **ATV-Teams** — Control plane for teams. Org chart, budgets, goal alignment, heartbeat execution, board approvals.
- **Chamber** — Peer-to-peer agent coordination. A2A delegation, shared memory, agent discovery.

**Agency CLI** — TBD; not fully documented here.

---

## Next Steps

1. **For Rugger:** You're already using it. Continue with `spawn_sub_agent()`, `task_manage()`, and `memory_write()` as normal.

2. **For WorkPilot:** Check if auto-start is working (`http://localhost:3003/#/chat`). If you see it running, start using it for recurring jobs and approvals-via-Teams workflows.

3. **For ATV-Teams:** Spin up the local dev environment:
   ```bash
   cd C:\Dev-bin\my-Github-Repos\ATV-Teams\
   pnpm install
   pnpm dev
   # Open http://localhost:3100
   ```
   Try: create a test company, hire 2 agents, create a simple goal, set tasks, and run one heartbeat cycle manually.

4. **For ClawPilot:** It's already installed. Open it and browse your Rugger channels and memory.

5. **For GitHub Copilot CLI:** Use directly for quick coding and chat. It's the foundation; everything relies on it.

6. **For Agency CLI:** Mark as TBD. Request documentation when you're ready to integrate it into daily workflow.

---

## Document Metadata

- **Generated:** June 14, 2026
- **Scope:** All six AI tools in Nick's stack (Rugger, WorkPilot, ClawPilot, ATV-Teams, GitHub Copilot CLI, Agency CLI)
- **Source Documents:**
  - `C:\Dev-bin\my-Github-Repos\ATV-Teams\NICK-ATV-Teams-vs-Rugger-and-assistant-matrix.md`
  - `C:\Dev-bin\my-Github-Repos\ATV-Teams\README.md`
  - `C:\Dev-bin\my-Github-Repos\ATV-Teams\AGENTS.md`
- **Format:** Structured Markdown with consistent per-tool template, comparison table, and decision guide
- **Status:** Ready for daily reference and troubleshooting

---

## End of Guide

Use this guide as a quick reference when you're unsure which tool to reach for. Bookmark the decision guide. Refer back to the specific tool section when you need detailed syntax or gotchas.

Happy orchestrating!
