const fs = require('fs');
const lines = fs.readFileSync('e:/My Project/kotibox Ott/Xoto_Ott_dashboard/src/lib/api-client.ts', 'utf8').split('\n');

lines.forEach((line, i) => {
  if (line.includes('getAds') || line.includes('createAd') || line.includes('updateAd') || line.includes('deleteAd') || line.includes('useGetAds')) {
    console.log(`${i+1}: ${line}`);
  }
});
