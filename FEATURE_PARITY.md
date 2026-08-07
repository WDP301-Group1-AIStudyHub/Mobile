# Mobile / Web feature parity

Audited against `Front-end/Front-end-AIStudyHub` on 2026-07-12.

| Area | Mobile status | Notes |
| --- | --- | --- |
| Authentication and profile | Complete | Login, invite/deep-link registration, reset/change password, profile editing and role guards. |
| Document library | Complete | Mine/shared/starred/trash, search/filter, bulk actions, upload/download, restore/permanent delete and empty trash. |
| Document details and sharing | Complete | Metadata, versions, star, share management and shared-document subject assignment. |
| Subjects | Complete | CRUD, semester, workspace documents, members/roles, teams/team membership and document VIEW/EDIT grants. |
| Study materials | Complete | Generation/list/detail/delete, flashcard study, quiz and explanation flow. |
| AI chat | Complete | History and threads, document scope, delete, thread update API and chat artifacts. |
| Chat artifacts | Complete | Flashcards, quiz, mind map, report and data table generation, polling, preview and deletion. |
| Evaluation and benchmark | Complete | Benchmark question/run/summary plus RAG evaluation logs and summary. |
| Admin | Complete | Dashboard, users/ban, documents and activity logs with admin guards. |

Marketing-only web pages (`/` and `/about`) are intentionally excluded. Mobile uses native layouts rather than pixel-matching the web UI.

## Verification

- `npx tsc --noEmit`
- `npx expo-doctor` (18/18 checks)
- `npx expo export --platform web --output-dir .expo-export-check` (48 routes)

No missing backend contract was found for the implemented parity features. Dependency audit currently reports transitive Expo SDK 54 advisories; upgrading to SDK 57 is a separate breaking-change migration.
