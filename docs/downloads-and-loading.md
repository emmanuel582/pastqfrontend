# Downloads and artwork loading — 21 October 2026

Broad Explore categories only expand their contents, with no download action or border around the opened category. Download actions belong to specific institutions, exam collections and individual materials. The themed dialog offers **All subjects** (start immediately) or **Choose subjects** (choose collections, subjects and individual source papers). Closing the dialog starts no download.

The picker owns a bounded scrolling region and a separate footer. Long subject lists and paper lists support touch, mouse and keyboard scrolling while the download action stays visible. Multiple collections keep their own bundle identities, publishers, embedded diagrams and offline records. Verified download parts and completed collection commits are reused on retry. A multi-collection completion opens the Saved library.

Category loading art shares the actual `StudyArt` SVG paths. Official JAMB/WAEC logos and Scholar poses use inline SVG silhouettes traced from the alpha channel of existing shipped assets. The loading outline requires no network request. Artwork replaces it after decoding; failed images keep their existing fallback. The initial HTML and welcome screen use the same Scholar outline. Reduced-motion preferences disable the loading pulse and dialog entrance animation.

To remap silhouettes after changing artwork, run `python scripts/trace-skeleton-shapes.py` with Pillow installed, then review the resulting `src/app/components/skeletonShapes.ts`. No new raster artwork is generated.
