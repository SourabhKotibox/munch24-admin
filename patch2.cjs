const fs = require('fs');
let file = fs.readFileSync('src/App.tsx', 'utf8');

// Replace all instances of `component={() => <ProtectedRoute component={XYZ} />} />`
// with `><ProtectedRoute component={XYZ} /></Route>`
// Ensure it matches exactly the format used.

file = file.replace(/component=\{\(\) => <ProtectedRoute component=\{([A-Za-z0-9_]+)\} \/>\} \/>/g, '>\n                <ProtectedRoute component={$1} />\n              </Route>');

fs.writeFileSync('src/App.tsx', file);
console.log('Fixed anonymous functions in Route components');
