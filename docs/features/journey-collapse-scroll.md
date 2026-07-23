# Journey Timeline

## Contract

The Journey remains a section of `about.html`. A visitor sees the three most
recent roles first and can reveal earlier roles in batches. When `Recent only
↑` is pressed, only the timeline collapses; it must never route the viewport
to Contact.

The final frame anchors the bottom of `Recent only ↑` 72px above the bottom of
the viewport. Contact is therefore below the fold and enters only through the
next manual scroll.

## Boundaries

| Responsibility | Module |
| --- | --- |
| Role markup and editable fields | `js/entities.js` + `js/admin.js` |
| Timeline state and labels | `js/features/journey/timeline-state.js` |
| Compact-state measurement and viewport anchor | `js/features/journey/timeline-geometry.js` |
| Pointer glow | `js/features/journey/timeline-glow.js` |
| Control, disclosure and Lenis coordination | `js/features/journey/index.js` |
| Page composition | `about.html` |

The admin never mounts the visitor component. It edits the same `roles`
collection directly, without a disclosure button or transient animation state.

## Fold sequence

1. Measure the current list and the third card.
2. Derive the compact list height and final document position of the existing
   button. No section edge or document maximum is used as an anchor.
3. Pause Lenis, then animate the list's shrink and native `scrollY` together
   for 1500ms — mirrored, frame for frame, by growth of a spacer placed right
   after the control (`foldSpacer` in `index.js`). The list gives up height
   exactly as fast as the spacer reserves it, so the timeline column's total
   height, and therefore the page's maximum scroll, never changes during the
   fold. `scrollY` is always free to reach the interpolated target without the
   browser clamping it into Contact, and `.section--journey`'s `overflow:
   clip` boundary never shrinks either, so the sticky intro keeps its full
   range for every frame.
4. Once the animation lands exactly on the measured target, commit the
   compact DOM (which removes the height the spacer was holding, now entirely
   below the viewport) and release the spacer back to 0. Write the measured
   target once more, resize Lenis, and resume normal scrolling.

Scroll-driven transforms on Journey are disabled only while the fold is in
progress, so the original heading retains its native sticky context. There are
no heading clones, wrappers or fixed-position substitutes.
