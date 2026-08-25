# Review evidence

Atlas has two distinct historical review records:

- Daily Review records morning capacity: energy, stress, motivation, attention
  budget, notes, and deterministic summary.
- Daily Wrap-Up records evening evidence: plan fit, estimate fit, completion,
  Time Blocks, Focus Session actuals, notes, and explicit carry-forward.

Both are immutable. Daily Reviews may have multiple records on one date;
consumers that need one daily observation use the newest repository-ordered
record. Daily Wrap-Up permits one record per date.

Historical analytics reads these records through repository contracts and
never modifies them. See `docs/daily-wrap-up.md` and
`docs/historical-analytics.md` for calculation boundaries.
