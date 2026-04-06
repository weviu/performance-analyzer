const fs = require("fs");
const path = require("path");

const csvPath = path.join(__dirname, "..", "athlete_events.csv");
const outPath = path.join(__dirname, "..", "lib", "sportBenchmarks.json");

const content = fs.readFileSync(csvPath, "utf8");
const lines = content.split("\n");

// Parse header to find column indices
const header = parseCSVLine(lines[0]);
const IDX = {
  height: header.indexOf("Height"),
  weight: header.indexOf("Weight"),
  sport: header.indexOf("Sport"),
};

// Accumulate totals per sport
const sportData = {};

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  const cols = parseCSVLine(line);
  const sport = cols[IDX.sport];
  const heightStr = cols[IDX.height];
  const weightStr = cols[IDX.weight];

  if (!sport || heightStr === "NA" || weightStr === "NA" || !heightStr || !weightStr) continue;

  const height = parseFloat(heightStr);
  const weight = parseFloat(weightStr);

  if (isNaN(height) || isNaN(weight)) continue;

  if (!sportData[sport]) {
    sportData[sport] = { totalHeight: 0, totalWeight: 0, count: 0 };
  }

  sportData[sport].totalHeight += height;
  sportData[sport].totalWeight += weight;
  sportData[sport].count += 1;
}

// Build output, filter < 50 samples, sort alphabetically
const result = {};
Object.keys(sportData)
  .sort()
  .forEach((sport) => {
    const d = sportData[sport];
    if (d.count < 50) return;
    result[sport] = {
      avgHeight: Math.round((d.totalHeight / d.count) * 10) / 10,
      avgWeight: Math.round((d.totalWeight / d.count) * 10) / 10,
      sampleSize: d.count,
    };
  });

fs.writeFileSync(outPath, JSON.stringify(result, null, 2));

const sports = Object.keys(result);
console.log(`\nDone! ${sports.length} sports written to lib/sportBenchmarks.json:\n`);
sports.forEach((s) => {
  const d = result[s];
  console.log(`  ${s}: height ${d.avgHeight}cm, weight ${d.avgWeight}kg (n=${d.sampleSize})`);
});

// Simple CSV line parser that handles quoted fields
function parseCSVLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}
