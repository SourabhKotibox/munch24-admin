const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, '..', 'src', 'pages', 'influencers.tsx');
let content = fs.readFileSync(filepath, 'utf8');

// 1. Inject editForm
if (!content.includes('const [editForm, setEditForm]')) {
  const editFormState = `
  // Edit Form State
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "influencer",
    modulePermissions: { ...defaultModulePermissions },
  });
`;
  content = content.replace(
    /const \[createForm, setCreateForm\] = useState\(\{[\s\S]*?\}\);/,
    match => match + '\n' + editFormState
  );
}

// 2. Replace handleEditInfluencer
const oldHandleEdit = `const handleEditInfluencer = (influencer: Influencer) => {
    setSelectedInfluencer(influencer);
    setIsEditModalOpen(true);
  };`;
const newHandleEdit = `const handleEditInfluencer = (influencer: Influencer) => {
    setSelectedInfluencer(influencer);
    setEditForm({
      name: influencer.name,
      email: influencer.email,
      phone: influencer.phone || "",
      role: influencer.role,
      modulePermissions: influencer.modulePermissions || { ...defaultModulePermissions },
    });
    setIsEditModalOpen(true);
  };`;
content = content.replace(oldHandleEdit, newHandleEdit);

// 3. Inject handleEditSubmit
if (!content.includes('const handleEditSubmit')) {
  const handleEditSubmitStr = `
  const handleEditSubmit = async () => {
    if (!selectedInfluencer) return;
    try {
      await updateMutation.mutateAsync({
        id: selectedInfluencer.id,
        data: editForm
      });
      toast({ title: "Influencer updated successfully" });
      setIsEditModalOpen(false);
      await refetch();
    } catch (error: any) {
      toast({ title: error?.message || "Failed to update influencer", variant: "destructive" });
    }
  };
`;
  content = content.replace(
    /const handleToggleStatus = async/,
    match => handleEditSubmitStr + '\n  ' + match
  );
}

// 4. Inject Edit Modal JSX
if (!content.includes('{/* Edit Modal */}')) {
  // Extract create modal
  const createModalRegex = /\{\/\* Create Modal \*\/\}([\s\S]*?)\{\/\* Credentials Display Modal \*\/\}/;
  const match = content.match(createModalRegex);
  if (match) {
    let createModalCode = match[1];
    
    // Transform Create to Edit
    let editModalCode = createModalCode
      .replace(/isCreateModalOpen/g, 'isEditModalOpen')
      .replace(/setIsCreateModalOpen/g, 'setIsEditModalOpen')
      .replace(/Add New Influencer/g, 'Edit Influencer')
      .replace(/createForm/g, 'editForm')
      .replace(/setCreateForm/g, 'setEditForm')
      .replace(/handleCreateSubmit/g, 'handleEditSubmit')
      .replace(/createMutation\.isPending/g, 'updateMutation.isPending')
      .replace(/Creating\.\.\./g, 'Saving...')
      .replace(/Create & Send Credentials/g, 'Save Changes');

    // Make Email read-only in Edit
    editModalCode = editModalCode.replace(
      /(<Label className="text-foreground">Email \*\<\/Label>\s*<Input\s*type="email"\s*placeholder="email@example\.com"\s*className="bg-muted border-border text-foreground"\s*value=\{editForm\.email\})\s*onChange=\{[^\}]+\}/g,
      '$1 readOnly className="bg-muted/50 text-muted-foreground"'
    );

    const injected = `\n      {/* Edit Modal */}${editModalCode}\n      {/* Credentials Display Modal */}`;
    content = content.replace(createModalRegex, `\{/* Create Modal */\}${createModalCode}${injected}`);
  }
}

fs.writeFileSync(filepath, content, 'utf8');
console.log('Successfully injected Edit Modal logic.');
