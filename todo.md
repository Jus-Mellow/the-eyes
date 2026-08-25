# Project TODO

- [x] Build the dark cinematic anime-inspired THE EYE visual system with neon indigo, cyan, violet, and red accents.
- [x] Create the privacy-first landing page with clear connection messaging, primary calls to action, and the exact name “THE EYE.”
- [x] Implement the central animated eye with pointer-reactive gaze, connection/sharing visual states, blink behavior, and reduced-motion support.
- [x] Implement authenticated two-person connection persistence with partner code, request, accept, decline, and disconnect flows.
- [x] Persist per-user sharing preferences and expose explicit start, pause, and stop location-sharing controls.
- [x] Implement browser geolocation permission readiness using watchPosition only after explicit opt-in.
- [x] Implement a responsive dashboard with partner presence, distance/last-update status, map-style location view, and sharing state visibility.
- [x] Add privacy and safety messaging that makes user control and non-secret tracking explicit.
- [x] Add backend schema, helpers, and tRPC procedures for profiles, connections, sharing preferences, and locations.
- [x] Add Vitest coverage for privacy defaults, connection state transitions, and location-sharing authorization.
- [ ] Verify desktop and mobile layouts plus key interactions with the development preview.
- [ ] Create the final project checkpoint after all items are complete.

## Change history

- [x] Refined brief: prioritize elegant, polished, dark cinematic anime-inspired landing experience with prominent privacy and connection CTAs.
- [x] Refined brief: ensure the eye responds to pointer movement and connection/sharing status.
- [x] Refined brief: persist authenticated two-person relationships and sharing preferences.
- [x] Refined brief: provide responsive location dashboard and browser geolocation permission readiness.
- [x] Refined brief: make active sharing controls explicit and visible.
- [x] Refined brief: use the exact product name “THE EYE.”

## Constraints

- Location sharing must always be explicit opt-in; no secret or background tracking.
- Do not fabricate reviews, ratings, testimonials, or other user-generated content.
- Keep static assets outside the project directory unless they are small configuration files.
- Do not add external secrets unless required; browser geolocation remains permission-gated.
- Keep the product presentation polished and privacy-first rather than resembling a generic map clone.

## Implementation notes

- Use the existing full-stack scaffold and prebuilt UI components where they fit.
- Use a map-style visualization that is functional without requiring a third-party map token; keep the architecture ready for a provider integration later.
- Use tRPC for all frontend/backend communication and preserve the existing Manus authentication flow.
- Keep all location-sharing mutations server-authorized to the explicitly connected partner relationship.
- Respect prefers-reduced-motion throughout the visual system.

## Verification log

- [x] Typecheck passes.
- [x] Vitest suite passes.
- [x] Production build passes.
- [x] Desktop preview reviewed.
- [x] Mobile preview reviewed.
- [ ] Final checkpoint saved.

## Notes

This checklist is intentionally additive and will retain completed items as project history.


- [x] Add Vitest integration coverage for connection request, accept, decline, disconnect, and router-level sharing authorization flows.
- [ ] Exercise key authenticated preview interactions end-to-end, including connection form validation, privacy toggles, disconnect, and geolocation permission/error handling. (Live browser sign-in was unavailable; user requested to continue without it.)

- [ ] Complete a real authenticated browser interaction pass for partner-code validation/submission, accept/decline, disconnect, sharing controls, and geolocation permission allow/deny states. (Deferred at user request.)
