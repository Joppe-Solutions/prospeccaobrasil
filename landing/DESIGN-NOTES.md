# Design references and assets

The September refinement uses original React/CSS implementations, informed by the clear separation of service areas and business segments at https://vbmc.com.br/ and the restrained hover-feedback ideas in the component collection at https://uiverse.io/elements. No third-party component source was copied.

The 16 sector names come from `segmentsList` in the original institutional site's `internal/handler/institutional.go`. The four service areas follow the original home: implantation, network expansion, commercial locations, investors/family offices. Location formats are listed separately from sectors. The existing institutional figures and testimonials were carried forward; this redesign does not independently substantiate them.

## Hero image

- File: `public/images/hero-architecture.png`
- Method: built-in imagegen tool, genuine alpha transparency, generated conceptual architecture rather than an actual client project.
- Original output: `/Users/relterborges/.codex/generated_images/01a0979c-9eee-7700-b827-b28daf5c9f7b/exec-d3917ef6-4cc9-4e54-b77c-8e1275e36d77.png`
- Final prompt:

> Use case: stylized-concept. Asset type: transparent PNG cutout for right side of premium Brazilian commercial real-estate consultancy website hero. Create one exquisitely crafted photorealistic architectural scale model, isolated on genuinely TRANSPARENT alpha background. Subject: a compact city block composed of a contemporary 4-floor office/retail building with pale warm limestone, deep teal glass facade and champagne bronze mullions, connected to low-rise street-front shops with large glazed storefronts and slim canopies, tiny restrained landscaping trees. Three-quarter elevated architectural product photograph view. One coherent composition, large striking sculptural silhouette, a slim rectangular architectural model plinth, whole model fully visible with generous transparent margins. Warm shop interiors and fine material detail, sophisticated premium architecture competition model, subtle studio illumination, no text, no labels, no logos, no map pins, no people, no cards, no UI, no background city, no sky, no opaque ground or backdrop. Balanced square 1024 composition, polished real architectural materiality, not cartoon. Actual transparent background, not checkerboard drawn in the image. Intended to sit on a very dark petroleum-green webpage.

The navigation uses a wider, centered CSS window around the original monogram. The source logo remains intact, and the full signature is used in the footer.
