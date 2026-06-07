export const TEAMS = [
  { id: "ARG", name: "Argentina",    flag: "🇦🇷", group: "A", baseCount: 47 },
  { id: "AUS", name: "Australia",    flag: "🇦🇺", group: "B", baseCount: 12 },
  { id: "BEL", name: "Belgium",      flag: "🇧🇪", group: "C", baseCount: 28 },
  { id: "BRA", name: "Brazil",       flag: "🇧🇷", group: "D", baseCount: 44 },
  { id: "CMR", name: "Cameroon",     flag: "🇨🇲", group: "E", baseCount:  7 },
  { id: "CAN", name: "Canada",       flag: "🇨🇦", group: "F", baseCount: 33 },
  { id: "CHN", name: "China PR",     flag: "🇨🇳", group: "G", baseCount: 19 },
  { id: "COL", name: "Colombia",     flag: "🇨🇴", group: "H", baseCount: 22 },
  { id: "CRI", name: "Costa Rica",   flag: "🇨🇷", group: "A", baseCount:  5 },
  { id: "CRO", name: "Croatia",      flag: "🇭🇷", group: "B", baseCount: 24 },
  { id: "DNK", name: "Denmark",      flag: "🇩🇰", group: "C", baseCount: 15 },
  { id: "ECU", name: "Ecuador",      flag: "🇪🇨", group: "D", baseCount:  9 },
  { id: "EGY", name: "Egypt",        flag: "🇪🇬", group: "E", baseCount: 11 },
  { id: "ENG", name: "England",      flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", group: "F", baseCount: 42 },
  { id: "FRA", name: "France",       flag: "🇫🇷", group: "G", baseCount: 45 },
  { id: "DEU", name: "Germany",      flag: "🇩🇪", group: "H", baseCount: 41 },
  { id: "GHA", name: "Ghana",        flag: "🇬🇭", group: "A", baseCount:  8 },
  { id: "GRC", name: "Greece",       flag: "🇬🇷", group: "B", baseCount: 10 },
  { id: "HND", name: "Honduras",     flag: "🇭🇳", group: "C", baseCount:  3 },
  { id: "HUN", name: "Hungary",      flag: "🇭🇺", group: "D", baseCount:  6 },
  { id: "IDN", name: "Indonesia",    flag: "🇮🇩", group: "E", baseCount: 18 },
  { id: "IRN", name: "Iran",         flag: "🇮🇷", group: "F", baseCount:  9 },
  { id: "ISR", name: "Israel",       flag: "🇮🇱", group: "G", baseCount:  4 },
  { id: "ITA", name: "Italy",        flag: "🇮🇹", group: "H", baseCount: 38 },
  { id: "JAM", name: "Jamaica",      flag: "🇯🇲", group: "A", baseCount:  6 },
  { id: "JPN", name: "Japan",        flag: "🇯🇵", group: "B", baseCount: 31 },
  { id: "KAZ", name: "Kazakhstan",   flag: "🇰🇿", group: "C", baseCount:  2 },
  { id: "KOR", name: "South Korea",  flag: "🇰🇷", group: "D", baseCount: 27 },
  { id: "MEX", name: "Mexico",       flag: "🇲🇽", group: "E", baseCount: 36 },
  { id: "MAR", name: "Morocco",      flag: "🇲🇦", group: "F", baseCount: 25 },
  { id: "NLD", name: "Netherlands",  flag: "🇳🇱", group: "G", baseCount: 30 },
  { id: "NZL", name: "New Zealand",  flag: "🇳🇿", group: "H", baseCount:  4 },
  { id: "NGA", name: "Nigeria",      flag: "🇳🇬", group: "A", baseCount: 14 },
  { id: "NOR", name: "Norway",       flag: "🇳🇴", group: "B", baseCount: 11 },
  { id: "PAN", name: "Panama",       flag: "🇵🇦", group: "C", baseCount:  3 },
  { id: "PRY", name: "Paraguay",     flag: "🇵🇾", group: "D", baseCount:  6 },
  { id: "PER", name: "Peru",         flag: "🇵🇪", group: "E", baseCount:  9 },
  { id: "POL", name: "Poland",       flag: "🇵🇱", group: "F", baseCount: 17 },
  { id: "POR", name: "Portugal",     flag: "🇵🇹", group: "G", baseCount: 34 },
  { id: "ROU", name: "Romania",      flag: "🇷🇴", group: "H", baseCount:  7 },
  { id: "SAU", name: "Saudi Arabia", flag: "🇸🇦", group: "A", baseCount: 13 },
  { id: "SEN", name: "Senegal",      flag: "🇸🇳", group: "B", baseCount: 10 },
  { id: "SRB", name: "Serbia",       flag: "🇷🇸", group: "C", baseCount: 11 },
  { id: "SVK", name: "Slovakia",     flag: "🇸🇰", group: "D", baseCount:  5 },
  { id: "ESP", name: "Spain",        flag: "🇪🇸", group: "E", baseCount: 40 },
  { id: "CHE", name: "Switzerland",  flag: "🇨🇭", group: "F", baseCount: 20 },
  { id: "URY", name: "Uruguay",      flag: "🇺🇾", group: "G", baseCount: 16 },
  { id: "USA", name: "United States",flag: "🇺🇸", group: "H", baseCount: 39 },
];

// Stable grid positions for each team's pin on the 2000×1500 canvas
// 8 cols × 6 rows, with padding so pins don't crowd the edges
const COLS = 8;
const ROWS = 6;
const PAD_X = 140;
const PAD_Y = 130;
const STEP_X = (2000 - PAD_X * 2) / (COLS - 1);
const STEP_Y = (1500 - PAD_Y * 2) / (ROWS - 1);

// Small jitter seeded per-team so pins don't sit on a rigid grid
function jitter(seed: number, range: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return ((x - Math.floor(x)) - 0.5) * range;
}

export const TEAM_PINS: Record<string, { x: number; y: number }> = Object.fromEntries(
  TEAMS.map((t, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    return [
      t.id,
      {
        x: Math.round(PAD_X + col * STEP_X + jitter(i * 3 + 1, 60)),
        y: Math.round(PAD_Y + row * STEP_Y + jitter(i * 3 + 2, 50)),
      },
    ];
  })
);
