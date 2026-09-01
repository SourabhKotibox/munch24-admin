const fs = require('fs');
const lines = fs.readFileSync('e:/My Project/kotibox Ott/Xoto_Ott_dashboard/src/lib/api-client.ts', 'utf8').split('\n');

lines.forEach((line, i) => {
  if (line.includes('export const get') && !line.includes('ById') && !line.includes('useGet')) {
    console.log(`${i+1}: ${line}`);
  }
});
