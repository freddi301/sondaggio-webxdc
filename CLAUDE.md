# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workflow gates

- For substantial work (new features, multi-file changes, non-trivial refactors),
  suggest running /feature-dev before implementing directly.
- Before considering a task complete, run /code-review.

## Library-specific caution

Don't assume API usage or idiomatic patterns for these libraries from general
knowledge. Ensure you have current documentation trough Context7 in context for:

- yjs
- webxdc
- svelte

## Code patterns

- Don't guess at code patterns. Follow idiomatic, proven best practices.
  If not already in context, pull them from the web.
- Follow this codebase's existing idioms over generic best practices when the two conflict.
- Never guess at a pattern you haven't seen used in this repo — grep for a real example first.

## When to ask

If anything is not obvious, ask before proceeding.

## Coherence

Keep translations up to date and coherent.
Keep Intro screen coherent with the app workings.
