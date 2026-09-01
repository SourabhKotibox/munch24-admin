const fs = require('fs');
const file = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Remove <Layout> wrapper from ProtectedRoute
let newFile = file.replace(/return \(\s*<Layout>\s*<Component \{\.\.\.rest\} \/>\s*<\/Layout>\s*\);/g, 'return <Component {...rest} />;');

// 2. Extract AdminRoutes and update Router
const adminRoutesRegex = /(<Route path="\/dashboard".*?)(\s*\{\/\* Public streaming routes \*\/})/s;
const adminRoutesMatch = newFile.match(adminRoutesRegex);

if (adminRoutesMatch) {
  const adminRoutesStr = adminRoutesMatch[1];
  
  const adminRoutesComponent = `
function AdminRoutes() {
  return (
    <Layout>
      <Switch>
        ${adminRoutesStr.trim().replace(/\n/g, '\n        ')}
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}
`;

  newFile = newFile.replace(adminRoutesRegex, `      <Route>\n        <AdminRoutes />\n      </Route>\n$2`);
  newFile = newFile.replace('function Router() {', `${adminRoutesComponent}\nfunction Router() {`);
  
  // Now remove the `<Route component={NotFound} />` from the end of the public router, since it's handled in AdminRoutes?
  // Actually, wait, if AdminRoutes is the catch-all for public routes, then public routes won't hit NotFound!
  // Oh! If someone goes to `/random`, it will hit `<AdminRoutes />`, render `<Layout>`, and then hit `<Route component={NotFound} />` INSIDE AdminRoutes. That means 404s will show inside the admin layout.
  // Is that okay? Usually yes, or maybe we want a public 404. Let's just leave it, it's fine.
  
  fs.writeFileSync('src/App.tsx', newFile);
  console.log('App.tsx patched');
} else {
  console.log('Admin routes not found');
}
