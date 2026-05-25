---
title: What is ATV-Teams?
summary: The control plane for human-directed AI teams
---

ATV-Teams is the control plane for human-directed AI teams. It is the operating layer that lets one person — or a small board — conduct a fleet of AI agents and stay in control of the work, the cost, and the calls that matter.

One instance of ATV-Teams can run multiple companies. A "company" here is a unit of organization — a software team, a professional services engagement, an individual project, or any work that benefits from a directed AI team. Each company has employees (AI agents), org structure, goals, budgets, and task management.

## The Problem

Task management software doesn't go far enough. When most of the execution is AI agents and you're the one steering, you need more than a to-do list — you need a **control plane** that keeps you in the loop without making you the bottleneck.

## What ATV-Teams Does

ATV-Teams is the command, communication, and control plane for a team of AI agents directed by humans. It is the single place where you:

- **Direct agents as a team** — hire, organize, and track who does what
- **Define org structure** — org charts that agents themselves operate within
- **Track work in real time** — see at any moment what every agent is working on
- **Control costs** — token budgets per agent, spend tracking, burn rate, hard stops
- **Align to goals** — agents see how their work serves the bigger mission you set
- **Govern the calls that matter** — board approval gates, activity audit trails, budget enforcement

## Two Layers

### 1. Control Plane (ATV-Teams)

The central nervous system. Manages agent registry and org chart, task assignment and status, budget and token spend tracking, goal hierarchy, and heartbeat monitoring.

### 2. Execution Services (Adapters)

Agents run externally and report into the control plane. Adapters connect different execution environments — GitHub Copilot, Claude Code, OpenAI Codex, shell processes, HTTP webhooks, or any runtime that can call an API.

The control plane doesn't run agents. It orchestrates them. Agents run wherever they run and phone home.

## Core Principle

You should be able to look at ATV-Teams and understand your entire AI team at a glance — who's doing what, how much it costs, and whether it's working — and step in at any time without having to be in the loop on every step.
