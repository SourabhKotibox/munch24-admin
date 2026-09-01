const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, '..', 'src', 'index.css');
let content = fs.readFileSync(filepath, 'utf8');

if (!content.includes('/* Global Dynamic Settings Styles */')) {
  const dynamicStyles = `
/* Global Dynamic Settings Styles */
body.card-style-glass .bg-card {
  background-color: rgba(var(--card), 0.5) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  border-color: rgba(255, 255, 255, 0.1) !important;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1) !important;
}
.dark body.card-style-glass .bg-card {
  background-color: rgba(0, 0, 0, 0.4) !important;
  border-color: rgba(255, 255, 255, 0.05) !important;
}

body.card-style-transparent .bg-card {
  background-color: transparent !important;
  border-color: transparent !important;
  box-shadow: none !important;
}
`;

  content += '\n' + dynamicStyles;
  fs.writeFileSync(filepath, content, 'utf8');
  console.log('Successfully added dynamic card styles to index.css.');
}
