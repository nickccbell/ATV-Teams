# ATV-Teams

**ATV-Teams is the operating layer for human-directed AI teams.** We are building the control plane that lets one person — or a small board — conduct a fleet of AI agents and stay in charge of the work, the cost, and the calls that matter. Our goal is for ATV-Teams-powered teams to collectively generate economic output that rivals the GDP of the world's largest countries — with humans at the conductor's stand. Every decision we make should serve that: make AI teams more capable, more governable, more scalable, and the humans directing them more effective.

## The Vision

The shape of work is changing. AI agents will do more and more of the execution — coding, drafting, researching, reviewing, coordinating — and the leverage will shift to the humans who direct them. One person with the right AI fleet will do the work of a team. A small team with the right fleet will do the work of a department. The work doesn't go away; the bottleneck does.

ATV-Teams is what makes that real. We are the control plane, the nervous system, the operating layer that lets a human stay in control as the number of agents grows. Every AI-driven team needs structure, task management, cost control, goal alignment, and human governance. That's us. Think of us as the operating system for the conductor of an AI orchestra — except the operating system is real software, not metaphor.

ATV-Teams works the same whether you're shipping software, running a professional services engagement, or driving an individual project. The same control plane carries a 2-agent solo project all the way up to a company-wide org with dozens of agents.

The measure of our success is not whether one team works. It's whether ATV-Teams becomes the default foundation that human-directed AI teams are built on — and whether those teams, collectively, become a serious economic force that rivals the output of nations.

## The Problem

Task management software doesn't go far enough. When most of the execution is AI agents and you're the one steering, you need more than a to-do list — you need a **control plane** that keeps you in the loop without making you the bottleneck.

## What This Is

ATV-Teams is the command, communication, and control plane for a team of AI agents directed by humans. It is the single place where you:

- **Direct agents as a team** — hire, organize, and track who does what
- **Define the structure** — org charts and reporting lines that agents themselves operate within
- **Track work in real time** — see at any moment what every agent is working on
- **Control costs** — token budgets per agent, spend tracking, burn rate, hard stops
- **Align to goals** — agents see how their work serves the bigger mission you set
- **Approve what matters** — governance gates for the calls that should stay human
- **Preserve work context** — comments, documents, work products, attachments, and team state stay attached to the work

## Architecture

Two layers:

### 1. Control Plane (this software)

The central nervous system. Manages:

- Agent registry and org chart
- Task assignment and status
- Budget and token spend tracking
- Issue comments, documents, work products, attachments, and company state
- Goal hierarchy (company → team → agent → task)
- Heartbeat monitoring — know when agents are alive, idle, or stuck

It also enforces execution-control semantics such as single-assignee issues, atomic checkout and execution locks, blockers, recovery issues, and workspace/runtime controls.

### 2. Execution Services (adapters)

Agents run externally and report into the control plane. Adapters connect different execution environments and define how a heartbeat is invoked, observed, and cancelled:

- **Local CLI/session adapters** — built-in adapters for tools such as Claude Code, Codex, Gemini, OpenCode, Pi, and Cursor
- **HTTP/process-style adapters** — command or webhook/API integrations for custom runtimes
- **OpenClaw gateway** — integration for OpenClaw-style remote agents
- **External adapter plugins** — dynamically loaded adapters installed outside the core app

The control plane doesn't run agents. It orchestrates them. Agents run wherever they run and phone home.

## Core Principle

You should be able to look at ATV-Teams and understand your entire AI team at a glance — who's doing what, how much it costs, and whether it's working — and step in at any time without having to be in the loop on every step.
