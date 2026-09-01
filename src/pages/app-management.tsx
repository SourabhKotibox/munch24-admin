import { useState, useCallback } from 'react';
import { Plus, Trash2, Edit2, X, Check, ChevronDown, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import {
  useGetAppSettings,
  useUpdateAppSettings,
  useAddAppSetting,
  useDeleteAppSetting,
  useEditAppSetting,
} from '@/lib/api-client';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableSettingProps {
  setting: any;
  onToggle: (id: string) => void;
  onEditItems: (setting: any) => void;
  onEditMeta: (setting: any) => void;
  onDelete: (id: string) => void;
}

const SortableSetting = ({ setting, onToggle, onEditItems, onEditMeta, onDelete }: SortableSettingProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: setting.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div
        className="flex items-center justify-between p-4 rounded-lg border border-border bg-card"
      >
        <div className="flex items-center gap-3 flex-1">
          <div
            {...{
              ...attributes,
              ...listeners,
            }}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          >
            <GripVertical className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{setting.name}</p>
            {setting.type === 'select' && setting.selectedItems?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {setting.selectedItems.map((item: string, idx: number) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="bg-primary text-white hover:bg-primary/90"
                  >
                    <X className="h-3 w-3 mr-1" />
                    {item}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {setting.type === 'select' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => onEditItems(setting)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => onEditMeta(setting)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg text-primary hover:bg-primary/10"
            onClick={() => onDelete(setting.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>

          <Switch
            checked={setting.enabled}
            onCheckedChange={() => onToggle(setting.id)}
            className="data-[state=checked]:bg-primary"
          />
        </div>
      </div>
    </div>
  );
};

export default function AppManagement() {
  const { toast } = useToast();
  const { data: appSettingsData, isLoading } = useGetAppSettings();
  const updateSettingsMutation = useUpdateAppSettings();
  const addSettingMutation = useAddAppSetting();
  const deleteSettingMutation = useDeleteAppSetting();
  const editSettingMutation = useEditAppSetting();

  const [editingSetting, setEditingSetting] = useState<any>(null);
  const [editingSettingMeta, setEditingSettingMeta] = useState<any>(null);
  const [tempSelectedItems, setTempSelectedItems] = useState<string[]>([]);
  const [addSettingOpen, setAddSettingOpen] = useState(false);
  const [newSettingName, setNewSettingName] = useState('');
  const [newSettingType, setNewSettingType] = useState<'simple' | 'select'>('simple');

  const [settings, setSettings] = useState<any[]>([]);

  const handleToggle = (id: string) => {
    const updatedSettings = settings.map((s: any) =>
      s.id === id ? { ...s, enabled: !s.enabled } : s
    );
    setSettings(updatedSettings);
    updateSettingsMutation.mutate(updatedSettings, {
      onSuccess: () => {
        toast({ title: 'Setting updated!' });
      },
    });
  };

  const handleSaveEdit = () => {
    if (!editingSetting) return;
    const updatedSettings = settings.map((s: any) =>
      s.id === editingSetting.id ? { ...editingSetting, selectedItems: tempSelectedItems } : s
    );
    setSettings(updatedSettings);
    updateSettingsMutation.mutate(updatedSettings, {
      onSuccess: () => {
        setEditingSetting(null);
        toast({ title: 'Setting saved!' });
      },
    });
  };

  const toggleItemSelection = (item: string) => {
    if (tempSelectedItems.includes(item)) {
      setTempSelectedItems(tempSelectedItems.filter(i => i !== item));
    } else {
      setTempSelectedItems([...tempSelectedItems, item]);
    }
  };

  const removeItem = (item: string) => {
    setTempSelectedItems(tempSelectedItems.filter(i => i !== item));
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = settings.findIndex((item: any) => item.id === active.id);
      const newIndex = settings.findIndex((item: any) => item.id === over.id);
      const newSettings = arrayMove(settings, oldIndex, newIndex);
      const orderedSettings = newSettings.map((item: any, index: number) => ({
        ...item,
        order: index,
      }));
      setSettings(orderedSettings);
      updateSettingsMutation.mutate(orderedSettings);
    }
  }, [settings, updateSettingsMutation]);

  const handleAddSetting = () => {
    if (!newSettingName.trim()) return;
    addSettingMutation.mutate(
      { name: newSettingName, type: newSettingType },
      {
        onSuccess: () => {
          setAddSettingOpen(false);
          setNewSettingName('');
          toast({ title: 'Setting added!' });
        },
      }
    );
  };

  const handleDeleteSetting = (id: string) => {
    deleteSettingMutation.mutate(id, {
      onSuccess: () => {
        toast({ title: 'Setting deleted!' });
      },
    });
  };

  const handleEditSettingMeta = () => {
    if (!editingSettingMeta) return;
    editSettingMutation.mutate(
      { id: editingSettingMeta.id, updates: { name: editingSettingMeta.name, type: editingSettingMeta.type } },
      {
        onSuccess: () => {
          setEditingSettingMeta(null);
          toast({ title: 'Setting updated!' });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-10 flex items-center justify-center">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  const currentSettings = settings.length > 0 ? settings : (appSettingsData?.data || []);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">App Management</h1>
        <Dialog open={addSettingOpen} onOpenChange={setAddSettingOpen}>
          <DialogTrigger asChild>
            <Button variant="default" className="bg-primary hover:bg-primary/90 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add Setting
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-popover border-border text-foreground">
            <DialogHeader>
              <DialogTitle className="text-foreground">Add New Setting</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-foreground">Name <span className="text-primary">*</span></Label>
                <Input
                  value={newSettingName}
                  onChange={(e) => setNewSettingName(e.target.value)}
                  className="bg-background border-border text-foreground"
                  placeholder="e.g., New Feature"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Type <span className="text-primary">*</span></Label>
                <div className="flex gap-2">
                  <Button
                    variant={newSettingType === 'simple' ? 'default' : 'ghost'}
                    onClick={() => setNewSettingType('simple')}
                    className={newSettingType === 'simple' ? 'bg-primary hover:bg-primary/90 text-white' : 'bg-transparent hover:bg-muted'}
                  >
                    Simple
                  </Button>
                  <Button
                    variant={newSettingType === 'select' ? 'default' : 'ghost'}
                    onClick={() => setNewSettingType('select')}
                    className={newSettingType === 'select' ? 'bg-primary hover:bg-primary/90 text-white' : 'bg-transparent hover:bg-muted'}
                  >
                    Select
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                className="bg-black text-white hover:bg-black/80"
                onClick={() => setAddSettingOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90 text-white"
                onClick={handleAddSetting}
              >
                Add
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={currentSettings.map((s: any) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {currentSettings.map((setting: any) => (
              <SortableSetting
                key={setting.id}
                setting={setting}
                onToggle={handleToggle}
                onEditItems={(s) => {
                  setEditingSetting(s);
                  setTempSelectedItems(s.selectedItems || []);
                }}
                onEditMeta={(s) => {
                  setEditingSettingMeta({
                    id: s.id,
                    name: s.name,
                    type: s.type,
                  });
                }}
                onDelete={handleDeleteSetting}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Dialog
        open={!!editingSetting}
        onOpenChange={(open) => {
          if (!open) setEditingSetting(null);
        }}
      >
        <DialogContent className="sm:max-w-[500px] bg-popover border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit Setting Items</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-foreground">Name</Label>
              <Input
                value={editingSetting?.name || ''}
                disabled
                className="bg-background border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Type</Label>
              <Input
                value="select"
                disabled
                className="bg-background border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Selected Items</Label>
              <div className="flex flex-wrap gap-2">
                {tempSelectedItems.map((item, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="bg-primary text-white hover:bg-primary/90 cursor-pointer"
                    onClick={() => removeItem(item)}
                  >
                    <X className="h-3 w-3 mr-1" />
                    {item}
                  </Badge>
                ))}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="max-h-[300px] overflow-y-auto"
                >
                  {editingSetting?.availableItems?.map((item: string, idx: number) => (
                    <DropdownMenuItem
                      key={idx}
                      onClick={() => toggleItemSelection(item)}
                      className="flex items-center gap-2"
                    >
                      {tempSelectedItems.includes(item) ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <div className="h-4 w-4" />
                      )}
                      {item}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              className="bg-black text-white hover:bg-black/80"
              onClick={() => setEditingSetting(null)}
            >
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-white"
              onClick={handleSaveEdit}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingSettingMeta}
        onOpenChange={(open) => {
          if (!open) setEditingSettingMeta(null);
        }}
      >
        <DialogContent className="sm:max-w-[425px] bg-popover border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit Setting</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-foreground">Name <span className="text-primary">*</span></Label>
              <Input
                value={editingSettingMeta?.name || ''}
                onChange={(e) => setEditingSettingMeta({ ...editingSettingMeta, name: e.target.value })}
                className="bg-background border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Type <span className="text-primary">*</span></Label>
              <div className="flex gap-2">
                <Button
                  variant={editingSettingMeta?.type === 'simple' ? 'default' : 'ghost'}
                  onClick={() => setEditingSettingMeta({ ...editingSettingMeta, type: 'simple' })}
                  className={editingSettingMeta?.type === 'simple' ? 'bg-primary hover:bg-primary/90 text-white' : 'bg-transparent hover:bg-muted'}
                >
                  Simple
                </Button>
                <Button
                  variant={editingSettingMeta?.type === 'select' ? 'default' : 'ghost'}
                  onClick={() => setEditingSettingMeta({ ...editingSettingMeta, type: 'select' })}
                  className={editingSettingMeta?.type === 'select' ? 'bg-primary hover:bg-primary/90 text-white' : 'bg-transparent hover:bg-muted'}
                >
                  Select
                </Button>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              className="bg-black text-white hover:bg-black/80"
              onClick={() => setEditingSettingMeta(null)}
            >
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-white"
              onClick={handleEditSettingMeta}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>


    </div>
  );
}
