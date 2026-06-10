-- Seed the wall with demo flags so it looks active.
-- Places N flags on N DISTINCT random grid cells (so none cover each other),
-- with random teams and timestamps spread over the last few days.
--
-- Grid is 48 x 32 = 1536 cells (must match src/lib/grid.ts on both sides).
-- Run:  psql "$DATABASE_URL" -v n=300 -f scripts/seed-flags.sql
-- (defaults to 300 if -v n is omitted)

\if :{?n}
\else
  \set n 300
\endif

INSERT INTO flags (team_id, x, y, payment_id, created_at)
SELECT
  (ARRAY[
    'DZA','ARG','AUT','AUS','BEL','BIH','BRA','CPV','CAN','COL','COD','CIV',
    'CRO','CZE','CUW','ECU','EGY','ENG','FRA','DEU','GHA','HTI','IRN','IRQ',
    'JPN','JOR','KOR','MEX','MAR','NLD','NZL','NOR','PAN','PRY','POR','QAT',
    'SAU','SCO','SEN','RSA','ESP','SWE','CHE','TUN','TUR','USA','URY','UZB'
  ])[1 + floor(random() * 48)::int],
  (cell % 48)::real AS x,
  (cell / 48)::real AS y,
  NULL,
  now() - (random() * interval '10 days')
FROM (
  SELECT generate_series(0, 1535) AS cell ORDER BY random() LIMIT :n
) cells;
