# Prompt speech input verification (2026-10-31)

The local change derives speech support after hydration and keeps the recognition
instance in a ref instead of synchronously setting React state inside an effect.
It retains the unsupported-browser disabled state and stops the instance on
cleanup.

Independent checks in an isolated candidate: targeted ESLint reported zero
errors (10 existing warnings); TypeScript completed successfully. A Node 24
and jsdom harness passed two tests: unsupported recognition disables the
button; a mocked recognition implementation supports server rendering and
hydration, start, final transcript delivery, and stop on unmount. The harness
was temporary and is not a persistent project test. No microphone, real speech
service, mobile device, or production account was used; these results do not
establish real browser speech-recognition compatibility.
