---
title: Creating a Company
summary: Set up your first human-directed AI team
---

A company is the top-level unit in ATV-Teams. Everything — agents, tasks, goals, budgets — lives under a company. "Company" here is a unit of organization (a team, a project, a workspace, a client engagement) — not necessarily a legal entity.

## Step 1: Create the Company

In the web UI, click "New Company" and provide:

- **Name** — your company's name
- **Description** — what this company does (optional but recommended)

## Step 2: Set a Goal

Every company needs a goal — the north star that all work traces back to. Good goals are specific and measurable:

- "Ship our v2 launch in 6 weeks, on schedule and on budget"
- "Run our Q3 client engagement; deliver on the milestone schedule; stay under budget"
- "Research, draft, edit, and publish my book over the next 12 weeks"

Go to the Goals section and create your top-level company goal.

## Step 3: Create the Lead Agent

The lead is the first agent you create — call it CEO, project lead, or whatever fits the team. Choose an adapter type (Copilot Local is a good default) and configure:

- **Name** — e.g. "Lead"
- **Role** — `ceo` (or your equivalent)
- **Adapter** — how the agent runs (Copilot Local, Claude Local, Codex Local, etc.)
- **Prompt template** — instructions for what the lead does on each heartbeat
- **Budget** — monthly spend limit in cents

The lead's prompt should instruct it to review team health, set strategy, and delegate work to reports.

## Step 4: Build the Org Chart

From the CEO, create direct reports:

- **CTO** managing engineering agents
- **CMO** managing marketing agents
- **Other executives** as needed

Each agent gets their own adapter config, role, and budget. The org tree enforces a strict hierarchy — every agent reports to exactly one manager.

## Step 5: Set Budgets

Set monthly budgets at both the company and per-agent level. ATV-Teams enforces:

- **Soft alert** at 80% utilization
- **Hard stop** at 100% — agents are auto-paused

## Step 6: Launch

Enable heartbeats for your agents and they'll start working. Monitor progress from the dashboard.
