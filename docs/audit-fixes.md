# Offline study and review audit fixes — 19 October 2026

Implemented against the F01–F10 audit of 2,192 competitor reviews and PastQ's own reproduced gaps. Theory stays self-assessed: no AI marking, keyword grading, invented answers or fabricated source diagrams.

| Finding | Shipped behavior |
| --- | --- |
| F01 | Plain question, option, key and explanation edits update rendered rich content while keeping source raster diagrams. Invalid choice questions are rejected. |
| F02 | Versioned app shell, bundled fonts and maths, cold offline launch and last authenticated owner restoration. Worker updates wait for open tabs to close. |
| F03 | Protected upload figures use authenticated requests and are embedded before an owner-scoped offline save. Tokens are not copied into saved question content. |
| F04 | Reports queue offline, sync with the owner account, reach an admin review screen and expose human review status. Stale edits are rejected; corrections create a new download version. Historical papers stay frozen. |
| F05 | Local completed papers supply actual topic evidence and the next downloaded topic to practise. Practice can prioritize unseen questions. Cloud outcome replay uses stable session/question identities; question content stays outside Supabase. |
| F06 | Subject/paper selections, verified resumable download parts, image decoding and an atomic final save. Storage controls distinguish downloaded packs, temporary parts and saved study work. Partial updates retain paper selections. |
| F07 | Incorrect/skipped/saved review filters, selected revision practice, searchable saved questions and optional offline notes. |
| F08 | Account-checked JSON backup/restore for supported sessions, original review papers, diagrams, bookmarks and notes. Restore preserves existing local records. This is a manual portable backup, not automatic cloud restoration. |
| F09 | UTME mock preset: English 60 plus three subjects of 40, 120 minutes. An undersized selected paper blocks the preset. Custom practice and one source year per subject remain available. No official score prediction. |
| F10 | Search downloaded wording, topics and years locally; view actual available subject/year/topic coverage. The human correction editor supports reviewed worked steps. Coverage is not a declaration that every syllabus topic or current literature edition is included. |
| WAEC | Written working checkpoints, explicit answer reveal, original question/option/answer/explanation diagrams, ungraded theory results and honest absent-answer states. |
| Preferences | Progress graph first, followed by Past sessions and Saved questions. Secondary screens use their own compact title. |

The UTME count and timing preset follows the [official JAMB 2026 training manual](https://jamb.gov.ng/PDFs/2026/2026%20TRAINING%20MANUAL%20%20final.pdf). Future editions require verification before relabelling this preset.

## Validation

- Frontend: 183 automated tests and production build passed.
- Combined local backend, including existing admin/privacy checks: 69 tests passed.
- Admin: six tests and production build passed; report editor checked at mobile and desktop widths.
- Browser checks: cold offline launch after expired auth, local fonts/maths shell, deadline-preserving resume, archived review/bookmarks, WAEC working/reveal/answer diagrams/zoom, ungraded theory results, notes, backup restore, selected revision, interrupted download resume, verified-part reuse, selected subject updates and local coverage search.
- Test accounts and source fixtures were isolated. These checks did not modify customer study records or publish trial academic corrections.

## Source limits requiring genuine source material / editorial review

All 95,355 imported UTME/WAEC records remain represented. Available imported raster assets cover 7,746 image placements across question, options, source answers and explanations. Two original WAEC image references are unavailable in the supplied export: Geography objective 2014 question 13's explanation image is an empty file; Physics theory 2013 question 11(c)'s solution graph is absent. The exact official WAEC Physics question page also does not supply that graph. Neither is replaced with an unrelated or generated image.

There are also 89 WAEC written records without a supplied answer. They remain available for practice with an explicit absent-answer message. A review workflow enables genuine corrections; it does not establish academic verification of every imported key or supply missing worked solutions automatically.

Device data can be removed by browser settings, private browsing, storage pressure or the operating system. Storage settings report shell readiness and offer browser storage protection plus a portable backup. Online account summaries are distinct from local full review papers.
