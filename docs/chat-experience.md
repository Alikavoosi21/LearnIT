# LearnIT: optional sources and chat experience

## Answer modes

The default selection is **استفاده از هوش مصنوعی برای حل**. A start request sets `useSources: false`. LangGraph runs `skip_context` instead of `retrieve_context`, stores `retrievalStatus: disabled`, and provides an empty reference context to solution generation and review. Independent calculation tools and Controlled Generative UI remain available.

**استفاده از منابع اپ** sets `useSources: true`: retrieval augments the same AI tutor with the app's indexed OpenStax material. It is not a separate search-only chatbot. Missing/unavailable sources do not prevent model generation, and are disclosed in the response. Resume and reteaching preserve the original lesson's choice. Changing the composer selection applies to a new question.

## Components and interaction decisions

Official Vercel AI Elements components were installed through the shadcn registry:

- `Conversation`, `ConversationContent`, and `ConversationScrollButton`: own scroll following and jump to the latest response.
- `Sources`, `SourcesTrigger`, `SourcesContent`, and `Source`: expose retrieved references and excerpts with provenance. Labels are Persian.
- shadcn `ToggleGroup`: accessible selection between direct solving and source-assisted answering.

The existing composer keeps its math keyboard, image validation, and paste support. The submitted question appears immediately during processing; actual LangGraph progress is shown without displaying private model reasoning. Errors retain the draft/image and offer retry of the exact request. Resume retries keep their idempotent event ID. Answers have a clipboard action with an explicit permission-failure state. New chats now show six opt-in examples with local mathematical previews; selecting one fills and focuses the composer without sending a request. This supersedes the earlier empty-start decision at the user's explicit request.

In direct AI mode, two negative model reviews no longer end the lesson with a generic inability notice. `recover_ai_answer` discards the rejected draft, reconstructs an independently calculable result (including the supported right-triangle hypotenuse case), or asks the model for a fresh correction. That fresh model answer remains `inconclusive` unless independently checked. Essential missing data routes to a specific clarification. This does not promise universal correctness or hide transport/configuration errors.

The app continues to use AI SDK `useChat` and the existing streamed typed result transport, CopilotKit's controlled `display_math` renderer, and the original LangGraph. Model-generated arbitrary UI code is not introduced. Formula rendering remains KaTeX because the tutor's structured steps already separate explanation and LaTeX.

## Projects and conversations

One navigation entry opens the conversation library. The redundant learning tab and "new question" actions were replaced by **چت جدید**. Each project is a lightweight group of conversations, with creation, renaming, filtering and deletion. Deleting a project keeps its chats ungrouped. Chat menus offer rename, move to project, and delete; the last deletion can be undone.

Chat IDs are independent from graph run IDs. New messages append to the selected chat; each turn still runs the original tutor graph. Up to six recent user/assistant messages (1,800 characters each) are validated and passed to analysis, generation and review as untrusted conversational context. New chats start with empty context. Editing the last user message excludes that turn from context and replaces its subsequent replies only after success. Regeneration similarly replaces the last turn. The "incorrect answer" flag is stored locally and is not advertised as a report sent to a remote team.

Projects, titles, text replies, source references and controlled scene specs persist in `localStorage`, with validation, a versioned key, and limits of 100 chats/projects, 200 stored replies per chat and four million serialized characters. Storage failure is disclosed. Original uploaded photo bytes remain in page memory; their extracted text persists. Saved chats can continue after reload using their textual history, without claiming to restore the old in-memory LangGraph checkpoint.

The composer stop action aborts the AI SDK request. HTTP stream cancellation/request abortion passes an AbortSignal to LangGraph and the OpenAI SDK. No incomplete reply is saved and the draft stays available. A provider may have already consumed tokens before cancellation arrives.

## Remaining boundaries

The generated explanation is delivered after graph review; node progress streams while it is prepared. This is not token-by-token text streaming. Graph runs remain server-session-scoped; the saved browser library provides conversational context for new runs. Multi-device sync, account login and response branching remain future work.

## Validation (2026-10-14)

The optional-source release passed 57 unit/service tests and nine browser scenarios. A live Luna/AvalAI browser session returned the correct integral of x² on [0,1], 1/3, in both modes; only the source-assisted mode exposed retrieved OpenStax references. The project/chat release passed 61 unit/service tests and all 13 browser scenarios, including persisted history, context isolation, last-message edits, deletion/undo, project movement, local feedback and abort propagation. Project movement was rerun after replacing a clipped nested menu with an accessible selection dialog. Production build and TypeScript passed.

The visual-start/direct-recovery update passed 66 unit/service tests, 15 browser scenarios, TypeScript and the production build. Browser checks cover six previews, no automatic tutor calls, selected question insertion/focus, and mobile overflow. Forced-rejection tests cover computed triangle/tool recovery and fresh AI correction or targeted clarification.

## Official references

- https://elements.ai-sdk.dev/
- https://elements.ai-sdk.dev/components/conversation
- https://elements.ai-sdk.dev/components/sources
- https://elements.ai-sdk.dev/components/prompt-input
- https://elements.ai-sdk.dev/components/message
