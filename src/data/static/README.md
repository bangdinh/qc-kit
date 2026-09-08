Static fixture data (JSON/CSV) that several specs share — reference payloads,
lookup tables, expected result sets. Load with `readJson()` from
`src/utils/file.util.ts`, or import directly (`resolveJsonModule` is on).

Keep generated/per-test data in factories instead; only put stable, reviewed
data here.
