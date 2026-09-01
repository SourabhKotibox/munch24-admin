const fs = require('fs');
const lines = fs.readFileSync('e:/My Project/kotibox Ott/Xoto_Ott_dashboard/src/lib/api-client.ts', 'utf8').split('\n');

const keywords = ['getMovies', 'getShows', 'getTvShows', 'getShortDramas', 'getShortDrama'];
lines.forEach((line, i) => {
  if (keywords.some(k => line.includes(k))) {
    console.log(`${i+1}: ${line}`);
  }
});
