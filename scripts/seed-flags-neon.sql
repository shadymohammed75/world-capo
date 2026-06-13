-- Seed 300 demo flags — paste this straight into Neon's SQL Editor and Run.
-- (Plain SQL version of seed-flags.sql, no psql variables.)
-- Places 300 flags on 300 DISTINCT random grid cells (48x32), random teams,
-- timestamps spread over the last 10 days. Run once. Running again adds 300 more.

INSERT INTO flags (team_id, x, y, payment_id, created_at)
SELECT
  (ARRAY[
    'DZA','ARG','AUT','AUS','BEL','BIH','BRA','CPV','CAN','COL','COD','CIV',
    'CRO','CZE','CUW','ECU','EGY','ENG','FRA','DEU','GHA','HTI','IRN','IRQ',
    'JPN','JOR','KOR','MEX','MAR','NLD','NZL','NOR','PAN','PRY','POR','QAT',
    'SAU','SCO','SEN','RSA','ESP','SWE','CHE','TUN','TUR','USA','URY','UZB'
  ])[1 + floor(random() * 48)::int],
  (cell % 48)::real,
  (cell / 48)::real,
  NULL,
  now() - (random() * interval '10 days')
FROM (
  SELECT cell FROM generate_series(0, 1535) AS cell ORDER BY random() LIMIT 300
) cells;
