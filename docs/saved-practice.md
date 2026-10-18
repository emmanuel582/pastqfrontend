# Saved practice

Unfinished exams, completed answer reviews, and question bookmarks live in account-scoped IndexedDB stores on the current browser/device. They are available without an API connection once the app is open. Clearing browser data removes these local records; they do not transfer to another device.

Each attempt stores its exact question order and only the source images it references. Checkpoints store answers, written responses, flags, and the current question separately from the immutable paper. Resuming retains the original deadline, including time spent away. An expired attempt finishes using its saved answers. Cross-tab ownership prevents an older tab from overwriting an exam resumed elsewhere.

Only outcome summaries and existing opaque question-attempt metadata sync to the account. Question text, source answers, explanations, and images are not uploaded to Supabase. A completed archive recovers a missing summary after an interrupted save. Legacy score-only history cannot reconstruct answers and is labelled accordingly.

Bookmarks keep the original question and referenced images for review. Flagging remains a separate, temporary exam-navigation action. Theory marking is unchanged: the app displays the source answer, without AI or keyword scoring.

Verification: `npm test` and `npm run build`. Browser checks cover real UTME Biology/Chemistry diagrams, offline resume, unchanged deadlines, answer/flag restoration, reopening completed corrections after reload, bookmarks, and expired-attempt completion.
