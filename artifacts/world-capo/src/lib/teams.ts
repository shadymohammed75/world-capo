export const TEAMS = [
  { id: "ARG", name: "Argentina",    flag: "🇦🇷", group: "A", baseCount: 0 },
  { id: "AUS", name: "Australia",    flag: "🇦🇺", group: "B", baseCount: 0 },
  { id: "BEL", name: "Belgium",      flag: "🇧🇪", group: "C", baseCount: 0 },
  { id: "BRA", name: "Brazil",       flag: "🇧🇷", group: "D", baseCount: 0 },
  { id: "CMR", name: "Cameroon",     flag: "🇨🇲", group: "E", baseCount: 0 },
  { id: "CAN", name: "Canada",       flag: "🇨🇦", group: "F", baseCount: 0 },
  { id: "CHN", name: "China PR",     flag: "🇨🇳", group: "G", baseCount: 0 },
  { id: "COL", name: "Colombia",     flag: "🇨🇴", group: "H", baseCount: 0 },
  { id: "CRI", name: "Costa Rica",   flag: "🇨🇷", group: "A", baseCount: 0 },
  { id: "CRO", name: "Croatia",      flag: "🇭🇷", group: "B", baseCount: 0 },
  { id: "DNK", name: "Denmark",      flag: "🇩🇰", group: "C", baseCount: 0 },
  { id: "ECU", name: "Ecuador",      flag: "🇪🇨", group: "D", baseCount: 0 },
  { id: "EGY", name: "Egypt",        flag: "🇪🇬", group: "E", baseCount: 0 },
  { id: "ENG", name: "England",      flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", group: "F", baseCount: 0 },
  { id: "FRA", name: "France",       flag: "🇫🇷", group: "G", baseCount: 0 },
  { id: "DEU", name: "Germany",      flag: "🇩🇪", group: "H", baseCount: 0 },
  { id: "GHA", name: "Ghana",        flag: "🇬🇭", group: "A", baseCount: 0 },
  { id: "GRC", name: "Greece",       flag: "🇬🇷", group: "B", baseCount: 0 },
  { id: "HND", name: "Honduras",     flag: "🇭🇳", group: "C", baseCount: 0 },
  { id: "HUN", name: "Hungary",      flag: "🇭🇺", group: "D", baseCount: 0 },
  { id: "IDN", name: "Indonesia",    flag: "🇮🇩", group: "E", baseCount: 0 },
  { id: "IRN", name: "Iran",         flag: "🇮🇷", group: "F", baseCount: 0 },
  { id: "ISR", name: "Israel",       flag: "🇮🇱", group: "G", baseCount: 0 },
  { id: "ITA", name: "Italy",        flag: "🇮🇹", group: "H", baseCount: 0 },
  { id: "JAM", name: "Jamaica",      flag: "🇯🇲", group: "A", baseCount: 0 },
  { id: "JPN", name: "Japan",        flag: "🇯🇵", group: "B", baseCount: 0 },
  { id: "KAZ", name: "Kazakhstan",   flag: "🇰🇿", group: "C", baseCount: 0 },
  { id: "KOR", name: "South Korea",  flag: "🇰🇷", group: "D", baseCount: 0 },
  { id: "MEX", name: "Mexico",       flag: "🇲🇽", group: "E", baseCount: 0 },
  { id: "MAR", name: "Morocco",      flag: "🇲🇦", group: "F", baseCount: 0 },
  { id: "NLD", name: "Netherlands",  flag: "🇳🇱", group: "G", baseCount: 0 },
  { id: "NZL", name: "New Zealand",  flag: "🇳🇿", group: "H", baseCount: 0 },
  { id: "NGA", name: "Nigeria",      flag: "🇳🇬", group: "A", baseCount: 0 },
  { id: "NOR", name: "Norway",       flag: "🇳🇴", group: "B", baseCount: 0 },
  { id: "PAN", name: "Panama",       flag: "🇵🇦", group: "C", baseCount: 0 },
  { id: "PRY", name: "Paraguay",     flag: "🇵🇾", group: "D", baseCount: 0 },
  { id: "PER", name: "Peru",         flag: "🇵🇪", group: "E", baseCount: 0 },
  { id: "POL", name: "Poland",       flag: "🇵🇱", group: "F", baseCount: 0 },
  { id: "POR", name: "Portugal",     flag: "🇵🇹", group: "G", baseCount: 0 },
  { id: "ROU", name: "Romania",      flag: "🇷🇴", group: "H", baseCount: 0 },
  { id: "SAU", name: "Saudi Arabia", flag: "🇸🇦", group: "A", baseCount: 0 },
  { id: "SEN", name: "Senegal",      flag: "🇸🇳", group: "B", baseCount: 0 },
  { id: "SRB", name: "Serbia",       flag: "🇷🇸", group: "C", baseCount: 0 },
  { id: "SVK", name: "Slovakia",     flag: "🇸🇰", group: "D", baseCount: 0 },
  { id: "ESP", name: "Spain",        flag: "🇪🇸", group: "E", baseCount: 0 },
  { id: "CHE", name: "Switzerland",  flag: "🇨🇭", group: "F", baseCount: 0 },
  { id: "URY", name: "Uruguay",      flag: "🇺🇾", group: "G", baseCount: 0 },
  { id: "USA", name: "United States",flag: "🇺🇸", group: "H", baseCount: 0 },
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
