# Roadmap

Where Planning Poker is today and where it's going. The guiding principle is that **a team should be estimating within seconds of opening the link, with no account and no setup.** Anything that compromises that gets pushed back or made optional.

Last updated: October 2026

## Shipped

| Version | Highlights                                                                                                                                                  |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.1     | Rooms with shareable codes, real-time voting over WebSockets, reveal and new round, moderator controls, Fibonacci and T-shirt decks, dark mode              |
| 0.2     | Observer mode, round history, reveal confirmation, multi-moderator (promote, step down, claim), consensus celebration, accessibility pass, PWA, Azure CI/CD |
| 0.3     | Vote distribution chart, moderator kick, clearer voting status, mobile layout polish, auto-removal of disconnected participants                             |

## Now: housekeeping

Small things that make the project easier to trust and show off.

- [x] Add a `LICENSE` file.
- [x] Refresh screenshots, now covering desktop and mobile, voting and results.
- [ ] Add a short demo GIF to the README (create a room, vote, reveal, celebrate).
- [ ] Smoke test in CI that hits the deployed site after each deploy.

## Next: estimating better

Features that improve the quality of the conversation, not just the mechanics.

- [ ] **Re-vote flow.** After a reveal with a wide spread, a one-click "discuss and re-vote" that keeps the topic and clears votes.
- [ ] **Outlier prompts.** Highlight the lowest and highest voters after reveal so the discussion starts in the right place.
- [ ] **Custom decks.** Moderator-defined card values, plus presets such as Modified Fibonacci, powers of 2, and hours.
- [ ] **Bring back `?` and ☕ as optional cards.** They were removed as defaults and could return as a per-room toggle.
- [ ] **Countdown timer.** Optional timebox per round with a visible countdown.
- [ ] **Topic queue.** Paste a list of stories up front, then step through them. Final estimates are recorded against each one.
- [ ] **Final estimate.** The moderator confirms an agreed value after discussion, separate from the raw votes.

## Later: sessions that outlive the tab

This is the biggest architectural step. It removes the main limitation today, which is that restarting the server ends every active session.

- [ ] **Pluggable storage.** Put a storage interface behind `sessionStorage` with in-memory as the default.
- [ ] **Redis adapter.** Survive restarts and deploys without dropping rooms.
- [ ] **Horizontal scaling.** Pub/sub fan-out so multiple instances can serve the same room. This is required before scaling out on Azure.
- [ ] **Export results.** Download a session's rounds as CSV or Markdown.
- [ ] **Jira / Azure DevOps / GitHub integration.** Import stories, write agreed estimates back. This only matters once the topic queue exists.

## Later: polish and reach

- [ ] Localisation (start with English, plus one or two others to prove out the plumbing)
- [ ] Sound and haptic feedback on reveal, off by default
- [ ] Custom room themes and avatars
- [ ] Playwright visual-regression tests on key screens
- [ ] Basic privacy-friendly analytics (rooms created, average session length) to inform priorities

## Deliberately out of scope

Saying no keeps the app fast and simple.

- **User accounts and mandatory sign-in.** Identity stays name-only.
- **Long-term analytics dashboards and velocity tracking.** Better handled by the tracker teams already use.
- **Chat or video.** Teams already have a call open while they estimate.
- **Ads or paywalled core features.**

## Ideas welcome

Open an issue on [GitHub](https://github.com/ChrisBrooksbank/planningpoker/issues) with the problem you're trying to solve. Real-world estimation pain points are more useful than feature requests.
