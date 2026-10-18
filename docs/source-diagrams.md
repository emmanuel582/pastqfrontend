# Source diagram verification — 19 October 2026

The offline browser audit decoded every available image placement in the current UTME and WAEC banks through `StudyWorkspace`, including questions, options, answers/solutions and explanations. It also checked that content became visible after decoding, topics matched the source, and solution metadata stayed hidden before reveal/submission.

| Bank | Question records | Reviewed image placements | Explanation/solution image placements |
| --- | ---: | ---: | ---: |
| UTME | 42,148 | 2,678 | 600 |
| WAEC CBT | 33,369 | 2,665 | 684 |
| WAEC theory / short answer | 19,838 | 2,403 | 1,470 |
| Total | 95,355 | 7,746 | 2,754 |

These are placements, including repeated uses of the same source asset. All asset references in the imported banks resolve. Two unavailable originals remain explicitly marked in the imported content:

- `objective>Geography>2014>13`: the original explanation PNG is an empty file.
- `theory>Physics>2013>11>c`: the referenced `2013 2.png` is absent from the supplied source.

The renderer accepts HTML-only answers and explanations and keeps distinct answer/explanation diagrams. Identical source answer/explanation HTML is not repeated. Original topic metadata is shown after reveal/submission; no difficulty label or inferred topic is added. Attempt and bookmark tests verify that separate answer/explanation assets and topics survive local storage.
