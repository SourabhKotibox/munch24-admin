const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, '..', 'src', 'pages', 'categories-browse.tsx');
let content = fs.readFileSync(filepath, 'utf8');

// 1. Fix handlePlay logic for short dramas
content = content.replace(
  /const isDrama = item\.contentType === "drama";/,
  'const isDrama = item.type === "drama" || item.contentType === "drama" || (item.seasons === undefined && item.totalEpisodes !== undefined);'
);

content = content.replace(
  /else if \(item\.type === "show"\)/,
  'else if (item.type === "show" || item.contentType === "show")'
);

// 2. Fix the "not perfect" short drama cards in mixed search grid.
// Currently ContentCard takes the full width of the grid column.
// If it's a mixed grid, the 9/16 card becomes huge.
// Let's add max-height and object-contain or max-w to the ContentCard for drama so it doesn't blow up.
content = content.replace(
  /className="relative overflow-hidden rounded-xl bg-zinc-900 transition-all duration-300 group-hover:ring-2 group-hover:ring-purple-500\/70 group-hover:scale-\[1\.03\]"\s*style=\{\{ aspectRatio: "9\/16" \}\}/,
  'className="relative overflow-hidden rounded-xl bg-zinc-900 transition-all duration-300 group-hover:ring-2 group-hover:ring-purple-500/70 group-hover:scale-[1.03] max-h-[400px] mx-auto w-full max-w-[220px]"\n          style={{ aspectRatio: "9/16" }}'
);

fs.writeFileSync(filepath, content, 'utf8');
console.log('Fixed categories-browse.tsx');
