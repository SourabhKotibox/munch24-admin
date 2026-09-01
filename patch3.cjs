const fs = require('fs');
let file = fs.readFileSync('src/App.tsx', 'utf8');

// Change ProtectedRoute definition
file = file.replace(
  /function ProtectedRoute\(\{\s*component:\s*Component,\s*\.\.\.rest\s*\}\s*:\s*\{\s*component:\s*any;\s*\[key:\s*string\]:\s*any\s*\}\)\s*\{/g,
  'function ProtectedRoute({ children }: { children: React.ReactNode }) {'
);

file = file.replace(
  /return <Component \{\.\.\.rest\} \/>;/g,
  'return <>{children}</>;'
);

// Now fix all the `<Route path="..."> <ProtectedRoute component={X} /> </Route>`
// to just `<Route path="..." component={X} />` inside AdminRoutes
file = file.replace(
  /<Route path="([^"]+)" >\s*<ProtectedRoute component=\{([^}]+)\} \/>\s*<\/Route>/g,
  '<Route path="$1" component={$2} />'
);

// Add `<ProtectedRoute>` around the Switch in AdminRoutes
file = file.replace(
  /<Switch>([\s\S]*?)<Route component=\{NotFound\} \/>\s*<\/Switch>/,
  '<ProtectedRoute>\n      <Switch>$1<Route component={NotFound} />\n      </Switch>\n    </ProtectedRoute>'
);

fs.writeFileSync('src/App.tsx', file);
console.log('Fixed ProtectedRoute to wrap the Switch instead of individual routes');
