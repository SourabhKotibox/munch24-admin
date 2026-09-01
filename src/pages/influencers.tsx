import { useState } from "react";
import { useLocation } from "wouter";
import { Plus, Search, Edit, Trash2, Lock, Unlock, Mail, Shield, User as UserIcon, Eye, EyeOff, Copy, Check, KeyRound, AlertTriangle, MailWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useGetAdminUsers, useCreateAdminUser, useUpdateAdminUser, useDeleteAdminUser, useResetAdminUserPassword, useToggleAdminUserStatus, useGetEmailStatus } from "@/lib/api-client";

interface Influencer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
  modulePermissions: {
    movies: { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean };
    genres: { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean };
    actors: { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean };
    directors: { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean };
    languages: { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean };
    categories: { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean };
    mediaLibrary: { canView: boolean; canUpload: boolean; canDelete: boolean };
    banners: { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean };
    promotions: { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean };
    reviews: { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean };
  };
  createdAt: string;
  createdBy?: { name: string; email: string };
}

const defaultModulePermissions = {
  movies: { canView: true, canCreate: false, canEdit: false, canDelete: false },
  shows: { canView: true, canCreate: false, canEdit: false, canDelete: false },
  shortDramas: { canView: true, canCreate: false, canEdit: false, canDelete: false },
  genres: { canView: true, canCreate: false, canEdit: false, canDelete: false },
  actors: { canView: true, canCreate: false, canEdit: false, canDelete: false },
  directors: { canView: true, canCreate: false, canEdit: false, canDelete: false },
  languages: { canView: true, canCreate: false, canEdit: false, canDelete: false },
  categories: { canView: true, canCreate: false, canEdit: false, canDelete: false },
  mediaLibrary: { canView: true, canUpload: false, canDelete: false },
  banners: { canView: true, canCreate: false, canEdit: false, canDelete: false },
  promotions: { canView: true, canCreate: false, canEdit: false, canDelete: false },
  influencers: { canView: true, canCreate: false, canEdit: false, canDelete: false },
  ads: { canView: true, canCreate: false, canEdit: false, canDelete: false },
  pages: { canView: true, canCreate: false, canEdit: false, canDelete: false },
  faqs: { canView: true, canCreate: false, canEdit: false, canDelete: false },
  subscriptions: { canView: true, canCreate: false, canEdit: false, canDelete: false },
  subscriptionPlans: { canView: true, canCreate: false, canEdit: false, canDelete: false },
  planLimits: { canView: true, canCreate: false, canEdit: false, canDelete: false },
  notifications: { canView: true, canCreate: false, canEdit: false, canDelete: false },
  notificationTemplates: { canView: true, canCreate: false, canEdit: false, canDelete: false },
  settings: { canView: true, canCreate: false, canEdit: false, canDelete: false },
  reviews: { canView: true, canCreate: false, canEdit: false, canDelete: false },
};

export default function InfluencersPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedInfluencer, setSelectedInfluencer] = useState<Influencer | null>(null);

  // Credentials modal state
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [newCredentials, setNewCredentials] = useState<{ email: string; password: string; name: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "influencer",
    modulePermissions: { ...defaultModulePermissions },
  });

  // Edit Form State
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "influencer",
    modulePermissions: { ...defaultModulePermissions },
  });


  // API hooks
  const { data: adminUsersData, isLoading, refetch } = useGetAdminUsers({ page: 1, limit: 100, search, role: roleFilter === 'all' ? undefined : roleFilter, status: statusFilter === 'all' ? undefined : statusFilter });
  const { data: emailStatus } = useGetEmailStatus();
  const createMutation = useCreateAdminUser();
  const updateMutation = useUpdateAdminUser();
  const deleteMutation = useDeleteAdminUser();
  const resetPasswordMutation = useResetAdminUserPassword();
  const toggleStatusMutation = useToggleAdminUserStatus();

  const influencers = adminUsersData?.data || [];
  const isEmailConfigured = emailStatus?.data?.configured || false;

  const handleCreateInfluencer = () => {
    setCreateForm({
      name: "",
      email: "",
      phone: "",
      role: "influencer",
      modulePermissions: { ...defaultModulePermissions },
    });
    setIsCreateModalOpen(true);
  };

  const handleEditInfluencer = (influencer: Influencer) => {
    setSelectedInfluencer(influencer);

    // Safely merge module permissions to ensure all keys exist
    const mergedPermissions = { ...defaultModulePermissions };
    if (influencer.modulePermissions) {
      Object.keys(defaultModulePermissions).forEach((key) => {
        const moduleKey = key as keyof typeof defaultModulePermissions;
        if (influencer.modulePermissions[moduleKey as keyof typeof influencer.modulePermissions]) {
          mergedPermissions[moduleKey] = {
            ...defaultModulePermissions[moduleKey],
            ...(influencer.modulePermissions[moduleKey as keyof typeof influencer.modulePermissions] as any)
          } as any;
        }
      });
    }

    setEditForm({
      name: influencer.name,
      email: influencer.email,
      phone: influencer.phone || "",
      role: influencer.role,
      modulePermissions: mergedPermissions,
    });
    setIsEditModalOpen(true);
  };

  
  const handleEditSubmit = async () => {
    if (!selectedInfluencer) return;
    try {
      await updateMutation.mutateAsync({
        id: selectedInfluencer.id,
        data: editForm
      });
      toast({ title: "User updated successfully" });
      setIsEditModalOpen(false);
      await refetch();
    } catch (error: any) {
      toast({ title: error?.message || "Failed to update user", variant: "destructive" });
    }
  };

  const handleToggleStatus = async (influencer: Influencer) => {
    try {
      await toggleStatusMutation.mutateAsync(influencer.id);
      toast({ title: "Status updated successfully" });
      await refetch();
    } catch (error: any) {
      toast({ title: error?.message || "Failed to update status", variant: "destructive" });
    }
  };

  const handleResetPassword = async (influencer: Influencer) => {
    try {
      const result = await resetPasswordMutation.mutateAsync(influencer.id);
      const password = result.data?.password || result.password;
      toast({
        title: "Password Reset Successful",
        description: `New password: ${password}`
      });
      // Also show in credentials modal
      setNewCredentials({ email: influencer.email, password, name: influencer.name });
      setShowCredentialsModal(true);
    } catch (error: any) {
      toast({
        title: "Failed to Reset Password",
        description: error?.message || "An error occurred",
        variant: "destructive"
      });
    }
  };

  const handleDeleteInfluencer = async (influencer: Influencer) => {
    if (confirm(`Are you sure you want to delete ${influencer.name}?`)) {
      try {
        await deleteMutation.mutateAsync(influencer.id);
        toast({ title: "User deleted successfully" });
        await refetch();
      } catch (error: any) {
        toast({ title: error?.message || "Failed to delete user", variant: "destructive" });
      }
    }
  };

  const handleCreateSubmit = async () => {
    if (!createForm.name || !createForm.email) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    try {
      const result = await createMutation.mutateAsync(createForm);
      setIsCreateModalOpen(false);

      // Show credentials modal with the generated password
      const password = result?.data?.password;
      if (password) {
        setNewCredentials({
          email: result?.data?.email || createForm.email,
          password,
          name: result?.data?.name || createForm.name,
        });
        setShowCredentialsModal(true);
      } else {
        const emailSent = result?.data?.emailSent;
        toast({
          title: "User Created Successfully",
          description: emailSent
            ? "Credentials sent via email"
            : "Email not sent — credentials shown below. Go to Settings → Mail to configure email.",
          variant: emailSent ? "default" : "destructive"
        });
      }
      await refetch();
    } catch (error: any) {
      toast({
        title: "Failed to Create User",
        description: error?.message || "An error occurred",
        variant: "destructive"
      });
    }
  };

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const handleCloseCredentials = () => {
    setShowCredentialsModal(false);
    setNewCredentials(null);
    setShowPassword(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Email Not Configured Warning */}
      {!isEmailConfigured && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 px-6 py-3">
          <div className="container mx-auto flex items-center gap-3">
            <MailWarning className="h-5 w-5 text-yellow-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-yellow-600 font-medium">
                Email is not configured — credentials will be shown on screen but NOT sent via email.
              </p>
              <p className="text-xs text-yellow-500/80 mt-0.5">
                Go to <strong>Settings</strong> → configure <strong>Mail Username</strong> and <strong>Mail Password</strong> to send emails automatically.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Role-Based Access</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage team members and their permissions</p>
            </div>
            <Button
              onClick={handleCreateInfluencer}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="container mx-auto px-6 py-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-muted border-border text-foreground"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full md:w-48 bg-muted border-border text-foreground">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-foreground">
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="superadmin">Super Admin</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="moderator">Moderator</SelectItem>
              <SelectItem value="influencer">Influencer</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48 bg-muted border-border text-foreground">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-foreground">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Influencers List */}
      <div className="container mx-auto px-6 pb-6">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                ) : influencers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      No users found
                    </td>
                  </tr>
                ) : (
                  influencers.map((influencer) => (
                    <tr key={influencer.id} className="hover:bg-muted/30">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <UserIcon className="h-5 w-5 text-red-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-foreground">{influencer.name}</div>
                            <div className="text-sm text-muted-foreground">{influencer.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          <Shield className="h-3 w-3 mr-1" />
                          {influencer.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          influencer.isActive
                            ? 'bg-green-500/10 text-green-500'
                            : 'bg-primary/10 text-primary'
                        }`}>
                          {influencer.isActive ? (
                            <>
                              <Unlock className="h-3 w-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <Lock className="h-3 w-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {new Date(influencer.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditInfluencer(influencer)}
                            className="text-foreground hover:text-primary"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResetPassword(influencer)}
                            className="text-foreground hover:text-primary"
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(influencer)}
                            className="text-foreground hover:text-primary"
                          >
                            {influencer.isActive ? (
                              <Lock className="h-4 w-4" />
                            ) : (
                              <Unlock className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteInfluencer(influencer)}
                            className="text-foreground hover:text-primary"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">Add New User</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Name *</Label>
                  <Input
                    placeholder="Full name"
                    className="bg-muted border-border text-foreground"
                    value={createForm.name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Email *</Label>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    className="bg-muted border-border text-foreground"
                    value={createForm.email}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Phone</Label>
                <Input
                  placeholder="+1234567890"
                  className="bg-muted border-border text-foreground"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Role *</Label>
                <Select
                  value={createForm.role}
                  onValueChange={(value) => setCreateForm(prev => ({ ...prev, role: value }))}
                >
                  <SelectTrigger className="bg-muted border-border text-foreground">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-foreground">
                    <SelectItem value="influencer">Influencer</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="font-semibold text-foreground">Module Permissions</h3>

                {Object.keys(defaultModulePermissions).map((module) => (
                  <div key={module} className="space-y-2 p-4 rounded-lg border border-border bg-muted/20">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground capitalize">{module}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      {module === 'mediaLibrary' ? (
                        <>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`${module}-view`}
                              checked={createForm.modulePermissions[module as keyof typeof defaultModulePermissions].canView}
                              onCheckedChange={(checked) => setCreateForm(prev => ({
                                ...prev,
                                modulePermissions: {
                                  ...prev.modulePermissions,
                                  [module]: {
                                    ...(prev.modulePermissions[module as keyof typeof defaultModulePermissions] as any),
                                    canView: checked
                                  }
                                }
                              }))}
                            />
                            <Label htmlFor={`${module}-view`} className="text-sm text-muted-foreground">View</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`${module}-upload`}
                              checked={(createForm.modulePermissions[module as keyof typeof defaultModulePermissions] as any).canUpload}
                              onCheckedChange={(checked) => setCreateForm(prev => ({
                                ...prev,
                                modulePermissions: {
                                  ...prev.modulePermissions,
                                  [module]: {
                                    ...(prev.modulePermissions[module as keyof typeof defaultModulePermissions] as any),
                                    canUpload: checked
                                  }
                                }
                              }))}
                            />
                            <Label htmlFor={`${module}-upload`} className="text-sm text-muted-foreground">Upload</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`${module}-delete`}
                              checked={createForm.modulePermissions[module as keyof typeof defaultModulePermissions].canDelete}
                              onCheckedChange={(checked) => setCreateForm(prev => ({
                                ...prev,
                                modulePermissions: {
                                  ...prev.modulePermissions,
                                  [module]: {
                                    ...(prev.modulePermissions[module as keyof typeof defaultModulePermissions] as any),
                                    canDelete: checked
                                  }
                                }
                              }))}
                            />
                            <Label htmlFor={`${module}-delete`} className="text-sm text-muted-foreground">Delete</Label>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`${module}-view`}
                              checked={createForm.modulePermissions[module as keyof typeof defaultModulePermissions].canView}
                              onCheckedChange={(checked) => setCreateForm(prev => ({
                                ...prev,
                                modulePermissions: {
                                  ...prev.modulePermissions,
                                  [module]: {
                                    ...(prev.modulePermissions[module as keyof typeof defaultModulePermissions] as any),
                                    canView: checked
                                  }
                                }
                              }))}
                            />
                            <Label htmlFor={`${module}-view`} className="text-sm text-muted-foreground">View</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`${module}-create`}
                              checked={(createForm.modulePermissions[module as keyof typeof defaultModulePermissions] as any).canCreate}
                              onCheckedChange={(checked) => setCreateForm(prev => ({
                                ...prev,
                                modulePermissions: {
                                  ...prev.modulePermissions,
                                  [module]: {
                                    ...(prev.modulePermissions[module as keyof typeof defaultModulePermissions] as any),
                                    canCreate: checked
                                  }
                                }
                              }))}
                            />
                            <Label htmlFor={`${module}-create`} className="text-sm text-muted-foreground">Create</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`${module}-edit`}
                              checked={(createForm.modulePermissions[module as keyof typeof defaultModulePermissions] as any).canEdit}
                              onCheckedChange={(checked) => setCreateForm(prev => ({
                                ...prev,
                                modulePermissions: {
                                  ...prev.modulePermissions,
                                  [module]: {
                                    ...(prev.modulePermissions[module as keyof typeof defaultModulePermissions] as any),
                                    canEdit: checked
                                  }
                                }
                              }))}
                            />
                            <Label htmlFor={`${module}-edit`} className="text-sm text-muted-foreground">Edit</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`${module}-delete`}
                              checked={(createForm.modulePermissions[module as keyof typeof defaultModulePermissions] as any).canDelete}
                              onCheckedChange={(checked) => setCreateForm(prev => ({
                                ...prev,
                                modulePermissions: {
                                  ...prev.modulePermissions,
                                  [module]: {
                                    ...(prev.modulePermissions[module as keyof typeof defaultModulePermissions] as any),
                                    canDelete: checked
                                  }
                                }
                              }))}
                            />
                            <Label htmlFor={`${module}-delete`} className="text-sm text-muted-foreground">Delete</Label>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                className="border-border text-foreground hover:bg-muted"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateSubmit}
                disabled={createMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                {createMutation.isPending ? "Creating..." : "Create & Send Credentials"}
              </Button>
            </div>
          </div>
        </div>
      )}

      
      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">Edit User</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Name *</Label>
                  <Input
                    placeholder="Full name"
                    className="bg-muted border-border text-foreground"
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Email *</Label>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    className="bg-muted/50 text-muted-foreground border-border"
                    value={editForm.email} readOnly
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Phone</Label>
                <Input
                  placeholder="+1234567890"
                  className="bg-muted border-border text-foreground"
                  value={editForm.phone}
                  onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Role *</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, role: value }))}
                >
                  <SelectTrigger className="bg-muted border-border text-foreground">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-foreground">
                    <SelectItem value="influencer">Influencer</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="font-semibold text-foreground">Module Permissions</h3>

                {Object.keys(defaultModulePermissions).map((module) => (
                  <div key={module} className="space-y-2 p-4 rounded-lg border border-border bg-muted/20">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground capitalize">{module}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      {module === 'mediaLibrary' ? (
                        <>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`${module}-view`}
                              checked={editForm.modulePermissions[module as keyof typeof defaultModulePermissions].canView}
                              onCheckedChange={(checked) => setEditForm(prev => ({
                                ...prev,
                                modulePermissions: {
                                  ...prev.modulePermissions,
                                  [module]: {
                                    ...(prev.modulePermissions[module as keyof typeof defaultModulePermissions] as any),
                                    canView: checked
                                  }
                                }
                              }))}
                            />
                            <Label htmlFor={`${module}-view`} className="text-sm text-muted-foreground">View</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`${module}-upload`}
                              checked={(editForm.modulePermissions[module as keyof typeof defaultModulePermissions] as any).canUpload}
                              onCheckedChange={(checked) => setEditForm(prev => ({
                                ...prev,
                                modulePermissions: {
                                  ...prev.modulePermissions,
                                  [module]: {
                                    ...(prev.modulePermissions[module as keyof typeof defaultModulePermissions] as any),
                                    canUpload: checked
                                  }
                                }
                              }))}
                            />
                            <Label htmlFor={`${module}-upload`} className="text-sm text-muted-foreground">Upload</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`${module}-delete`}
                              checked={editForm.modulePermissions[module as keyof typeof defaultModulePermissions].canDelete}
                              onCheckedChange={(checked) => setEditForm(prev => ({
                                ...prev,
                                modulePermissions: {
                                  ...prev.modulePermissions,
                                  [module]: {
                                    ...(prev.modulePermissions[module as keyof typeof defaultModulePermissions] as any),
                                    canDelete: checked
                                  }
                                }
                              }))}
                            />
                            <Label htmlFor={`${module}-delete`} className="text-sm text-muted-foreground">Delete</Label>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`${module}-view`}
                              checked={editForm.modulePermissions[module as keyof typeof defaultModulePermissions].canView}
                              onCheckedChange={(checked) => setEditForm(prev => ({
                                ...prev,
                                modulePermissions: {
                                  ...prev.modulePermissions,
                                  [module]: {
                                    ...(prev.modulePermissions[module as keyof typeof defaultModulePermissions] as any),
                                    canView: checked
                                  }
                                }
                              }))}
                            />
                            <Label htmlFor={`${module}-view`} className="text-sm text-muted-foreground">View</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`${module}-create`}
                              checked={(editForm.modulePermissions[module as keyof typeof defaultModulePermissions] as any).canCreate}
                              onCheckedChange={(checked) => setEditForm(prev => ({
                                ...prev,
                                modulePermissions: {
                                  ...prev.modulePermissions,
                                  [module]: {
                                    ...(prev.modulePermissions[module as keyof typeof defaultModulePermissions] as any),
                                    canCreate: checked
                                  }
                                }
                              }))}
                            />
                            <Label htmlFor={`${module}-create`} className="text-sm text-muted-foreground">Create</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`${module}-edit`}
                              checked={(editForm.modulePermissions[module as keyof typeof defaultModulePermissions] as any).canEdit}
                              onCheckedChange={(checked) => setEditForm(prev => ({
                                ...prev,
                                modulePermissions: {
                                  ...prev.modulePermissions,
                                  [module]: {
                                    ...(prev.modulePermissions[module as keyof typeof defaultModulePermissions] as any),
                                    canEdit: checked
                                  }
                                }
                              }))}
                            />
                            <Label htmlFor={`${module}-edit`} className="text-sm text-muted-foreground">Edit</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`${module}-delete`}
                              checked={(editForm.modulePermissions[module as keyof typeof defaultModulePermissions] as any).canDelete}
                              onCheckedChange={(checked) => setEditForm(prev => ({
                                ...prev,
                                modulePermissions: {
                                  ...prev.modulePermissions,
                                  [module]: {
                                    ...(prev.modulePermissions[module as keyof typeof defaultModulePermissions] as any),
                                    canDelete: checked
                                  }
                                }
                              }))}
                            />
                            <Label htmlFor={`${module}-delete`} className="text-sm text-muted-foreground">Delete</Label>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                className="border-border text-foreground hover:bg-muted"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditSubmit}
                disabled={updateMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      
      {/* Credentials Display Modal */}
      {showCredentialsModal && newCredentials && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
          <div className="bg-card rounded-xl border border-border w-full max-w-md mx-4 shadow-2xl">
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <KeyRound className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Login Credentials</h2>
                  <p className="text-sm text-muted-foreground">Share these with {newCredentials.name}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Warning Banner */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-600">
                  This password is shown only once. Copy it now — you won't be able to view it again.
                </p>
              </div>

              {/* Email / Login ID */}
              <div className="space-y-2">
                <Label className="text-foreground text-sm font-medium">Login ID (Email)</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-lg bg-muted border border-border">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground font-medium">{newCredentials.email}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(newCredentials.email, 'email')}
                    className="h-11 px-3 border-border"
                  >
                    {copiedField === 'email' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label className="text-foreground text-sm font-medium">Password</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-lg bg-muted border border-border">
                    <KeyRound className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground font-mono font-medium">
                      {showPassword ? newCredentials.password : '•'.repeat(newCredentials.password.length)}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className="h-11 px-3 border-border"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(newCredentials.password, 'password')}
                    className="h-11 px-3 border-border"
                  >
                    {copiedField === 'password' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Copy All */}
              <Button
                variant="outline"
                className="w-full border-border text-foreground hover:bg-muted"
                onClick={() => handleCopy(
                  `Login ID: ${newCredentials.email}\nPassword: ${newCredentials.password}`,
                  'all'
                )}
              >
                {copiedField === 'all' ? (
                  <>
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                    Copied All Credentials
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy All Credentials
                  </>
                )}
              </Button>
            </div>

            <div className="p-6 border-t border-border flex justify-end">
              <Button
                onClick={handleCloseCredentials}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
