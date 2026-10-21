# Downloads and artwork loading — 21 October 2026

Broad Explore categories only expand their contents, with no download action or border around the opened category. Download actions belong to specific institutions, exam collections and individual materials. The themed dialog offers **All subjects** (start immediately) or **Choose subjects** (choose collections, subjects and individual source papers). Closing the dialog starts no download.

The picker owns a bounded scrolling region and a separate footer. Long subject lists and paper lists support touch, mouse and keyboard scrolling while the download action stays visible. Multiple collections keep their own bundle identities, publishers, embedded diagrams and offline records. Verified download parts and completed collection commits are reused on retry.

Downloading replaces the picker with an animated Scholar progress screen, with pause, resume and selection changes. Completion stays on a receipt with **Keep browsing** and **View saved materials**. A download never starts exam setup automatically, including partial and single-collection downloads. Keep browsing returns to Explore even when preparation mode is enabled. Explore has no track dropdown. The choice dialog explains both options briefly.

Session setup has Subjects, Session and Review tabs with current-selection summaries. A subject editor always highlights Subjects, including when reached from Review; Done returns to the originating step. Changing tabs retains the current papers, topics, counts, timer and shuffle settings. Owner-scoped saved settings also retain mock and unseen-question preferences. Search and coverage tools are removed from setup.

Time is entered directly in hours and minutes, with no preset menu. Question counts accept any positive whole number within the selected paper/topic pool, with an All available shortcut. Changing time or count after the UTME mock preset switches to Custom and retains the student's choices. Earlier minute-only drafts still load. Invalid time/counts cannot start a session. The parent download action is hidden while its materials are expanded, then restored on collapse; only material-level actions remain inside an opened institution or exam board.

Category loading art shares the actual `StudyArt` SVG paths. Official JAMB/WAEC logos and Scholar poses use inline SVG silhouettes traced from the alpha channel of existing shipped assets. The loading outline requires no network request. Artwork replaces it after decoding; failed images keep their existing fallback. The initial HTML and welcome screen use the same Scholar outline. Reduced-motion preferences disable the loading pulse and dialog entrance animation.

To remap silhouettes after changing artwork, run `python scripts/trace-skeleton-shapes.py` with Pillow installed, then review the resulting `src/app/components/skeletonShapes.ts`. No new raster artwork is generated.
