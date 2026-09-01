const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, '..', 'src', 'index.css');
let content = fs.readFileSync(filepath, 'utf8');

if (!content.includes('body.menu-style-boxed aside')) {
  const menuStyles = `
/* Menu Style Boxed */
body.menu-style-boxed aside {
  margin: 1rem;
  height: calc(100vh - 2rem);
  border-radius: 1rem;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border);
}

/* Menu Style Soft */
body.menu-style-soft aside {
  background-color: transparent !important;
  border-right: none !important;
}
`;

  content += '\n' + menuStyles;
  fs.writeFileSync(filepath, content, 'utf8');
  console.log('Successfully added dynamic menu styles to index.css.');
}
