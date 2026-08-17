# Taste
- Communicates in Indonesian (Bahasa Indonesia) and expects responses in Indonesian as well. Confidence: 0.95
- Prefers document-driven development with strict separation of concerns between documents: PRD.md (product/business level only), ARCHITECTURE.md (tech stack, schema, technical decisions), AGENTS.md (actionable AI-agent instructions) — and wants the agent to actively keep content non-overlapping across documents. Confidence: 0.9
- Wants a brainstorm/discussion before each document is drafted, one document per turn, and explicit approval before moving to the next stage/document. Confidence: 0.9
- Once brainstorming is done, prefers the agent to immediately write the draft document on a short go-ahead like "tulis dulu" — incorporating the brainstorm decisions — rather than asking more questions. Confidence: 0.6
- When a decision belongs to a later document, prefers it to be recorded as an "open question" for that document rather than decided prematurely in the current one. Confidence: 0.9
- Prefers implementation breakdowns organized into phases (not flat task lists), written as markdown checkboxes, with a clear "STOP - review checkpoint" marker at the end of each phase for manual review before continuing. Confidence: 0.9
- Prefers independent workstreams to be executed in parallel within a single turn, with a concise summary of each part reported before overall review. Confidence: 0.8
- Prefers SolidJS (latest) for web dashboards, Expo React Native for mobile, and Elysia (Bun) for backend; wants the agent to flag if a preference doesn't fit a requirement and propose alternatives rather than following it blindly. Confidence: 0.9
- Treats SEO as an important decision factor when choosing the platform for a marketing/landing page (e.g., separate SEO-friendly site vs. sharing the dashboard platform). Confidence: 0.7
