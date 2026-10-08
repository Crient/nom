# Surgical UI pass — 2026-10-08

Scope: map framing, detail-header geometry, Surprise swipe badges and filter spacing. Friends changes follow as a separate task. No remote changes or Git mutations.

- PASS: replaced circular imagery + rectangular footer mask with one 16px rounded SDK viewport, preserving native Google logo/attribution, real coordinates/markers and Maps link. No SDK-internal attribution selectors or overlays.
- PASS: shared Restaurant FlowHeader keeps back/heart/overflow at inset + 4px, 44px touch targets, symmetric 14px edge insets and 4px between right targets. Heart SVG is centered inside its target. Dish hero back uses the same inset/edge geometry; that hero has no heart/overflow controls.
- PASS: reject badge moved from left to right; accept badge moved from right to left and says “Try this one”. Existing drag-progress opacity, transforms/thresholds, stack image identity, Undo, reduced motion and action directions are unchanged.
- PASS: pills use 12px horizontal padding (was 8px), 30px minimum visual height within existing 44px targets. Filter rows use 10px column/8px row gaps and 4px vertical breathing room. Removed the 390px rule that crowded gaps to 5px. Colors, fonts, radius and selection rules unchanged.
- PASS: 59 focused checks; full suite 1,302 tests in 79 files; normal production build/catalog/credential scans.
- PASS (DOM/CSS contracts only): 360/375/390/430/440 widths, wrapping and frame bounds. This does not constitute rendered pixel validation.
- BLOCKED: live visual/drag/Google-native-attribution inspection at each width: browser tooling reports “No browser is available”. Manually inspect localhost before approving; no screenshot proof is claimed.

Google attribution rules: https://developers.google.com/maps/documentation/javascript/policies . Native SDK footer remains inside the same viewport and is not separately masked or hidden.
