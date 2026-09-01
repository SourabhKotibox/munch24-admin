import { useState, useMemo } from 'react';
import {
  Plus, Trash2, Edit2, GripVertical, Check, Globe, EyeOff, LayoutGrid, List, Film, Layers, MonitorPlay, Save, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  useGetSections,
  useCreateSection,
  useUpdateSection,
  useDeleteSection,
  useReorderSections,
  useGetMovies,
  useGetContentList,
  useGetPublicAds,
} from '@/lib/api-client';
import { Checkbox } from '@/components/ui/checkbox';
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

interface SortableSectionProps {
  section: any;
  onToggle: (section: any) => void;
  onEdit: (section: any) => void;
  onDelete: (section: any) => void;
}

const SortableSection = ({ section, onToggle, onEdit, onDelete }: SortableSectionProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id || section._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 'auto',
  };

  const getLayoutIcon = (layout: string) => {
    switch (layout) {
      case 'horizontal': return <List className="w-4 h-4" />;
      case 'vertical': return <Layers className="w-4 h-4" />;
      case 'grid-2': return <LayoutGrid className="w-4 h-4" />;
      case 'grid-3': return <LayoutGrid className="w-4 h-4" />;
      case 'reels': return <Film className="w-4 h-4" />;
      default: return <List className="w-4 h-4" />;
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="relative mb-3">
      <div className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${section.isActive ? 'bg-card border-border' : 'bg-card/50 border-border/50 opacity-75'}`}>
        <div className="flex items-center gap-4 flex-1">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1"
          >
            <GripVertical className="h-5 w-5" />
          </div>
          
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-foreground">{section.title}</p>
              {!section.isActive && (
                <Badge variant="outline" className="text-[10px] py-0 border-border text-muted-foreground">Hidden</Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-md">
                {getLayoutIcon(section.layout)} {section.layout}
              </span>
              <span>Limit: {section.limit}</span>
              <span className="capitalize">
                Type: {section.itemType === 'landscape' ? 'Landscape (16:9)' : section.itemType === 'portrait' ? 'Portrait (2:3)' : section.itemType === 'drama' ? 'Short Drama (9:16)' : section.itemType === 'home-banner' ? 'Home Banner Ad' : section.itemType === 'google-adsense' ? 'Google Adsense Banner' : section.itemType}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Switch
            checked={section.isActive}
            onCheckedChange={() => onToggle(section)}
            className="data-[state=checked]:bg-primary"
          />
          <div className="h-6 w-px bg-border mx-1"></div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => onEdit(section)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-red-400 hover:bg-red-500/15"
            onClick={() => onDelete(section)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function WebHomeSections() {
  const { toast } = useToast();
  
  const { data: sectionsData, isLoading } = useGetSections({ platform: 'web' });
  const createMutation = useCreateSection();
  const updateMutation = useUpdateSection();
  const deleteMutation = useDeleteSection();
  const reorderMutation = useReorderSections();

  const { data: moviesRes } = useGetMovies({ limit: 500 });
  const { data: dramasRes } = useGetContentList({ limit: 500 });
  const { data: adsRes } = useGetPublicAds({ placement: 'Home Page' });

  const [localSections, setLocalSections] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  useMemo(() => {
    if (sectionsData?.data) {
      setLocalSections(sectionsData.data);
    }
  }, [sectionsData]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<any>(null);
  const [formData, setFormData] = useState({
    key: '',
    title: '',
    category: '',
    layout: 'horizontal',
    itemType: 'poster',
    limit: 10,
    isActive: true,
    showViewAll: true,
    filterKey: 'none',
    filterValue: '',
    sortKey: 'views',
    sortDir: -1,
    contentSelection: 'dynamic',
  });

  const [confirmDelete, setConfirmDelete] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = localSections.findIndex((s) => (s.id || s._id) === active.id);
      const newIndex = localSections.findIndex((s) => (s.id || s._id) === over.id);
      
      const newOrder = arrayMove(localSections, oldIndex, newIndex);
      setLocalSections(newOrder);

      const updates = newOrder.map((s, index) => ({
        id: s.id || s._id,
        position: index,
      }));

      reorderMutation.mutate(updates, {
        onSuccess: () => toast({ title: 'Sections reordered' })
      });
    }
  };

  const handleToggle = (section: any) => {
    const id = section.id || section._id;
    const newStatus = !section.isActive;
    updateMutation.mutate({ id, data: { isActive: newStatus } }, {
      onSuccess: () => toast({ title: newStatus ? 'Section enabled' : 'Section hidden' })
    });
  };

  const openAdd = () => {
    setEditingSection(null);
    setSelectedItems([]);
    setFormData({
      key: `section-${Date.now()}`,
      title: '',
      category: '',
      layout: 'horizontal',
      itemType: 'poster',
      limit: 10,
      isActive: true,
      showViewAll: true,
      filterKey: 'trending',
      filterValue: 'true',
      sortKey: 'views',
      sortDir: -1,
      contentSelection: 'dynamic'
    });
    setModalOpen(true);
  };

  const openEdit = (section: any) => {
    setEditingSection(section);
    let fKey = 'none';
    let fVal = '';
    let selected: string[] = section.manualContentIds || [];

    if (section.filter && Object.keys(section.filter).length > 0) {
      if (section.filter._id && section.filter._id.$in) {
        if (selected.length === 0) selected = section.filter._id.$in;
      } else {
        fKey = Object.keys(section.filter)[0];
        fVal = section.filter[fKey]?.toString() || 'true';
      }
    }
    
    setSelectedItems(selected);
    
    let sKey = 'views';
    let sDir = -1;
    if (section.sortBy && Object.keys(section.sortBy).length > 0) {
      sKey = Object.keys(section.sortBy)[0];
      sDir = section.sortBy[sKey] || -1;
    }

    setFormData({
      key: section.key,
      title: section.title,
      category: section.category || section.title,
      layout: section.layout || 'horizontal',
      itemType: section.itemType || 'poster',
      limit: section.limit || 10,
      isActive: section.isActive ?? true,
      showViewAll: section.showViewAll ?? true,
      filterKey: fKey,
      filterValue: fVal,
      sortKey: sKey,
      sortDir: sDir,
      contentSelection: section.contentSelection || (selected.length > 0 ? 'manual' : 'dynamic'),
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.title.trim()) return toast({ title: 'Title is required', variant: 'destructive' });

    const payload: any = {
      platform: 'web',
      key: formData.key || `section-${Date.now()}`,
      title: formData.title,
      category: formData.category || formData.title,
      contentType: 'mixed', // Web home sections mix both types
      layout: formData.layout,
      itemType: formData.itemType,
      limit: Number(formData.limit) || 10,
      isActive: formData.isActive,
      showViewAll: formData.showViewAll,
      contentSelection: formData.contentSelection,
      manualContentIds: selectedItems,
    };

    if (formData.filterKey && formData.filterKey !== 'none' && formData.filterKey !== 'specific') {
      let val: any = formData.filterValue;
      if (val === 'true') val = true;
      if (val === 'false') val = false;
      payload.filter = { [formData.filterKey]: val };
    } else {
      payload.filter = {};
    }

    if (formData.sortKey) {
      payload.sortBy = { [formData.sortKey]: Number(formData.sortDir) };
    } else {
      payload.sortBy = { views: -1 };
    }

    if (editingSection) {
      const id = editingSection.id || editingSection._id;
      updateMutation.mutate({ id, data: payload }, {
        onSuccess: () => {
          setModalOpen(false);
          toast({ title: 'Section updated successfully' });
        }
      });
    } else {
      payload.position = localSections.length;
      createMutation.mutate(payload, {
        onSuccess: () => {
          setModalOpen(false);
          toast({ title: 'Section created successfully' });
        }
      });
    }
  };

  const handleDelete = () => {
    if (!confirmDelete) return;
    const id = confirmDelete.id || confirmDelete._id;
    deleteMutation.mutate(id, {
      onSuccess: () => {
        setConfirmDelete(null);
        toast({ title: 'Section deleted' });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Web Home Layout Builder</h1>
          <p className="text-sm text-muted-foreground mt-1">Design and manage the dynamic sections of your web app's home screen. Drag to reorder.</p>
        </div>
        <Button onClick={openAdd} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4 mr-2" /> Add Section
        </Button>
      </div>

      <div className="bg-card border-border rounded-xl p-4">
        {isLoading ? (
          <div className="text-center py-10 text-muted-foreground/85">Loading layout...</div>
        ) : localSections.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border dark:border-zinc-800 rounded-xl">
            <LayoutGrid className="w-8 h-8 text-muted-foreground opacity-60 mx-auto mb-3" />
            <p className="text-foreground font-semibold mb-1">No sections configured</p>
            <p className="text-sm text-muted-foreground">The app will use fallback sections until you create some here.</p>
            <Button onClick={openAdd} variant="outline" className="mt-4 bg-transparent border-border dark:border-zinc-700 hover:bg-muted dark:hover:bg-white/5">
              Create First Section
            </Button>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={localSections.map(s => s.id || s._id)} strategy={verticalListSortingStrategy}>
              {localSections.map((section) => (
                <SortableSection
                  key={section.id || section._id}
                  section={section}
                  onToggle={handleToggle}
                  onEdit={openEdit}
                  onDelete={setConfirmDelete}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSection ? 'Edit Section' : 'Create Section'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid gap-2">
              <Label>Section Title <span className="text-red-500">*</span></Label>
              <Input
                placeholder="e.g. Trending Now"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-muted border-border"
              />
            </div>
            
            <div className="grid gap-2 mt-2">
              <Label>Fallback Category (Optional)</Label>
              <p className="text-[10px] text-muted-foreground mb-1">Set to one of the default keys (e.g. trendingNow, newReleases) to map to existing data.</p>
              <Input
                placeholder="e.g. trendingNow"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="bg-muted border-border"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Layout Style</Label>
                <Select value={formData.layout} onValueChange={(v) => {
                  if (v === 'ad') {
                    setFormData({ ...formData, layout: v, itemType: 'home-banner' });
                  } else if (formData.layout === 'ad' && v !== 'ad') {
                    setFormData({ ...formData, layout: v, itemType: 'landscape' });
                  } else {
                    setFormData({ ...formData, layout: v });
                  }
                }}>
                  <SelectTrigger className="bg-muted border-border">
                    <SelectValue placeholder="Select layout" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="horizontal">Horizontal Row</SelectItem>
                    <SelectItem value="grid">Grid View</SelectItem>
                    <SelectItem value="ad">Ad Banner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Item Style</Label>
                <Select value={formData.itemType} onValueChange={(v) => setFormData({ ...formData, itemType: v })}>
                  <SelectTrigger className="bg-muted border-border">
                    <SelectValue placeholder="Select item type" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.layout === 'ad' ? (
                      <>
                        <SelectItem value="home-banner">Home Banner Ad</SelectItem>
                        <SelectItem value="google-adsense">Google Adsense Banner</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="landscape">Landscape (16:9)</SelectItem>
                        <SelectItem value="portrait">Portrait (2:3)</SelectItem>
                        <SelectItem value="drama">Short Drama (9:16)</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.layout === 'ad' && formData.itemType === 'home-banner' && (
              <div className="grid gap-2 mt-2">
                <Label>Select Specific Ad (Optional)</Label>
                <p className="text-[10px] text-muted-foreground mb-1">Leave empty to show a random ad from the 'Home Page' placement.</p>
                <Select value={selectedItems[0] || 'random'} onValueChange={(v) => {
                  setSelectedItems(v === 'random' ? [] : [v]);
                }}>
                  <SelectTrigger className="bg-muted border-border">
                    <SelectValue placeholder="Random Ad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="random">Random Ad</SelectItem>
                    {adsRes?.data?.map((ad: any) => (
                      <SelectItem key={ad._id} value={ad._id}>{ad.adName || 'Unnamed Ad'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.layout !== 'ad' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Item Limit</Label>
                    <Input
                      type="number"
                      min="1"
                      max="50"
                      value={formData.limit}
                      onChange={(e) => setFormData({ ...formData, limit: parseInt(e.target.value) || 10 })}
                      className="bg-muted border-border"
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-8">
                    <Switch
                      checked={formData.showViewAll}
                      onCheckedChange={(checked) => setFormData({ ...formData, showViewAll: checked })}
                    />
                    <Label className="text-sm font-normal">Show "View All" Button</Label>
                  </div>
                </div>

                <div className="bg-muted/50 dark:bg-black/20 p-4 rounded-xl border border-border dark:border-white/5 space-y-4 mt-2">
                  <div className="grid gap-2">
                    <Label className="text-xs">Content Selection Mode</Label>
                    <Select value={formData.contentSelection} onValueChange={(v) => setFormData({ ...formData, contentSelection: v })}>
                      <SelectTrigger className="bg-muted border-border">
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dynamic">Dynamic (Auto-populate via Filters)</SelectItem>
                        <SelectItem value="manual">Manual (Only hand-picked items)</SelectItem>
                        <SelectItem value="mixed">Mixed (Filters + Hand-picked items)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
              {formData.contentSelection !== 'manual' && (
                <>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-4 mb-2">Dynamic Data Source</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="text-xs">Filter By (Field)</Label>
                      <Select value={formData.filterKey} onValueChange={(v) => setFormData({ ...formData, filterKey: v })}>
                        <SelectTrigger className="bg-muted border-border">
                          <SelectValue placeholder="No filter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Filter (All content)</SelectItem>
                          <SelectItem value="trending">Trending Status</SelectItem>
                          <SelectItem value="featured">Featured Status</SelectItem>
                          <SelectItem value="isNewContent">New Release</SelectItem>
                          <SelectItem value="genres">Genre Match</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs">Filter Value</Label>
                      <Input
                        placeholder="e.g. true, false, or Action"
                        value={formData.filterValue}
                        onChange={(e) => setFormData({ ...formData, filterValue: e.target.value })}
                        className="bg-muted border-border"
                        disabled={formData.filterKey === 'none'}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="grid gap-2">
                  <Label className="text-xs">Sort By</Label>
                  <Select value={formData.sortKey} onValueChange={(v) => setFormData({ ...formData, sortKey: v })}>
                    <SelectTrigger className="bg-muted border-border">
                      <SelectValue placeholder="Sort field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="createdAt">Date Added</SelectItem>
                      <SelectItem value="views">Total Views</SelectItem>
                      <SelectItem value="rating">Rating</SelectItem>
                      <SelectItem value="title">Alphabetical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs">Sort Direction</Label>
                  <Select value={formData.sortDir.toString()} onValueChange={(v) => setFormData({ ...formData, sortDir: parseInt(v) })}>
                    <SelectTrigger className="bg-muted border-border">
                      <SelectValue placeholder="Direction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-1">Descending (Highest/Newest first)</SelectItem>
                      <SelectItem value="1">Ascending (Lowest/Oldest first)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(formData.contentSelection === 'manual' || formData.contentSelection === 'mixed') && (
                <div className="col-span-2 space-y-3 pt-4 border-t border-border mt-2">
                  <Label className="text-xs">Select Specific Items ({selectedItems.length} selected)</Label>
                  
                  <Select onValueChange={(v) => {
                    if (v && !selectedItems.includes(v)) setSelectedItems([...selectedItems, v]);
                  }}>
                    <SelectTrigger className="bg-muted border-border">
                      <SelectValue placeholder="Click to add a title..." />
                    </SelectTrigger>
                    <SelectContent>
                      {moviesRes?.data?.map((item: any) => (
                        <SelectItem key={item._id} value={item._id}>[Movie] {item.title}</SelectItem>
                      ))}
                      {dramasRes?.data?.map((item: any) => (
                        <SelectItem key={item._id} value={item._id}>[Drama] {item.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedItems.length > 0 && (
                    <div className="flex flex-col gap-2 mt-3 bg-muted/30 dark:bg-black/20 border border-border dark:border-white/5 p-2 rounded-md max-h-48 overflow-y-auto">
                      {selectedItems.map(id => {
                        const matchedMovie = moviesRes?.data?.find((i: any) => i._id === id);
                        const matchedDrama = dramasRes?.data?.find((i: any) => i._id === id);
                        const matchedItem = matchedMovie || matchedDrama;
                        return (
                          <div key={id} className="flex items-center justify-between bg-muted/50 px-3 py-2 rounded-md text-sm border border-border/50">
                            <span className="truncate pr-4">{matchedItem ? (matchedMovie ? '[Movie] ' : '[Drama] ') + matchedItem.title : 'Unknown Title'}</span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 rounded-md hover:bg-red-500/20 hover:text-red-500 text-white/75"
                              onClick={() => setSelectedItems(selectedItems.filter(i => i !== id))}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
              </div>
            </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} className="border-border">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} className="bg-primary hover:bg-primary/90 text-white font-bold">
              <Save className="w-4 h-4 mr-2" /> {editingSection ? 'Update Section' : 'Create Section'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Section</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground text-sm">
              Are you sure you want to delete <span className="font-bold text-foreground">{confirmDelete?.title}</span>? This will instantly remove the row from the web app.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)} className="bg-transparent border-border">Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
