import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isSameDay } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useMemories } from '@/hooks/useMemories';
import { useCollections } from '@/hooks/useCollections';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { SearchBar } from '@/components/SearchBar';
import { MemoryCard } from '@/components/MemoryCard';
import { MemoryTimeline } from '@/components/MemoryTimeline';
import { AddMemoryModal } from '@/components/AddMemoryModal';
import { AddDecisionModal } from '@/components/AddDecisionModal';
import { DecisionCard } from '@/components/DecisionCard';
import { DecisionDetailDrawer } from '@/components/DecisionDetailDrawer';
import { EditMemoryModal } from '@/components/EditMemoryModal';
import { MemoryDetailDrawer } from '@/components/MemoryDetailDrawer';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AIChatButton } from '@/components/AIChatButton';
import { SearchModeToggle } from '@/components/SearchModeToggle';
import { OnboardingWalkthrough } from '@/components/OnboardingWalkthrough';
import { ActivityHeatmap } from '@/components/ActivityHeatmap';
import { TagFilter } from '@/components/TagFilter';
import { CollectionManager } from '@/components/CollectionManager';
import { ExportButton } from '@/components/ExportButton';
import { ExplainWithNotesPanel } from '@/components/ExplainWithNotesPanel';
import { CompressionPanel } from '@/components/CompressionPanel';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, LogOut, Loader2, FileText, Link, Image, FileIcon, Calendar, X, Mic, Bookmark, Sparkles, PanelLeftClose, PanelLeft, Scale, Lightbulb, Minimize2, Zap } from 'lucide-react';
import type { Memory, MemoryType, DecisionOutcome } from '@/types/memory';
import { cn } from '@/lib/utils';
import { useDummyData } from '@/hooks/useDummyData';

const filterOptions = [
  { value: 'all' as const, label: 'All', icon: null },
  { value: 'note' as const, label: 'Notes', icon: FileText },
  { value: 'link' as const, label: 'Links', icon: Link },
  { value: 'image' as const, label: 'Images', icon: Image },
  { value: 'pdf' as const, label: 'PDFs', icon: FileIcon },
  { value: 'voice_memo' as const, label: 'Voice', icon: Mic },
  { value: 'bookmark' as const, label: 'Bookmarks', icon: Bookmark },
];

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { seedDummyData } = useDummyData();
  const {
    memories,
    loading,
    searchResults,
    isSearching,
    createMemory,
    createDecision,
    updateMemory,
    updateDecisionOutcome,
    compressMemory,
    searchMemories,
    deleteMemory,
    refreshMemories,
    batchProcessMemories,
  } = useMemories();

  const {
    collections,
    createCollection,
    updateCollection,
    deleteCollection,
    addMemoryToCollection,
    removeMemoryFromCollection,
    getCollectionsForMemory,
    getMemoriesInCollection,
  } = useCollections();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'semantic' | 'keyword'>('semantic');
  const [activeFilter, setActiveFilter] = useState<MemoryType | 'all'>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [seedingData, setSeedingData] = useState(false);
  const [forceAddDemo, setForceAddDemo] = useState(false);
  const [processingEmbeddings, setProcessingEmbeddings] = useState(false);
  const [mainTab, setMainTab] = useState<'memories' | 'decisions' | 'ai-tools'>('memories');
  
  // Drawer/Modal states
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<Memory | null>(null);
  const [decisionDrawerOpen, setDecisionDrawerOpen] = useState(false);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchMemories(searchQuery, searchMode);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleMemoryClick = (memory: Memory) => {
    setSelectedMemory(memory);
    setDetailDrawerOpen(true);
  };

  const handleEditClick = (memory: Memory) => {
    setEditingMemory(memory);
    setDetailDrawerOpen(false);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (id: string, updates: { title: string; content?: string; tags?: string[] }) => {
    return updateMemory(id, updates);
  };

  const handleDecisionClick = (memory: Memory) => {
    setSelectedDecision(memory);
    setDecisionDrawerOpen(true);
  };

  const handleUpdateDecisionOutcome = async (id: string, outcome: DecisionOutcome, notes?: string) => {
    await updateDecisionOutcome(id, outcome, notes);
  };

  const handleCompressMemory = async (memoryId: string, compressedContent: string) => {
    await compressMemory(memoryId, compressedContent);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowHeatmap(false);
  };

  const clearDateFilter = () => {
    setSelectedDate(null);
  };

  const handleTagSelect = (tag: string) => {
    setSelectedTags((prev) => [...prev, tag]);
  };

  const handleTagDeselect = (tag: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
  };

  const clearTagFilter = () => {
    setSelectedTags([]);
  };

  const handleSeedData = async () => {
    if (!user) return;
    setSeedingData(true);
    const result = await seedDummyData(user.id, forceAddDemo);
    if (result.success) {
      refreshMemories();
      setForceAddDemo(false);
    } else if (result.hasExisting) {
      setForceAddDemo(true);
    }
    setSeedingData(false);
  };

  const handleBatchProcess = async () => {
    setProcessingEmbeddings(true);
    await batchProcessMemories();
    setProcessingEmbeddings(false);
  };

  // Filter memories by selected date, tags, and collection
  const filteredMemories = useMemo(() => {
    let result = memories;

    if (selectedDate) {
      result = result.filter((m) => isSameDay(new Date(m.created_at), selectedDate));
    }

    if (selectedTags.length > 0) {
      result = result.filter((m) => {
        const memoryTags = m.tags || (m.metadata as { tags?: string[] })?.tags || [];
        return selectedTags.some((tag) => memoryTags.includes(tag));
      });
    }

    if (selectedCollection) {
      const memoryIds = getMemoriesInCollection(selectedCollection);
      result = result.filter((m) => memoryIds.includes(m.id));
    }

    return result;
  }, [memories, selectedDate, selectedTags, selectedCollection, getMemoriesInCollection]);

  // Infinite scroll
  const {
    displayedItems: displayedMemories,
    hasMore,
    setLoadMoreTarget,
    displayedCount,
    totalCount,
  } = useInfiniteScroll({ items: filteredMemories, pageSize: 20 });

  const showSearchResults = searchQuery.trim() && (searchResults.length > 0 || isSearching);

  return (
    <div className="min-h-screen bg-background">
      <OnboardingWalkthrough />
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="container max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSidebar(!showSidebar)}
              className="md:flex hidden"
            >
              {showSidebar ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
            </Button>
            <div className="p-2 bg-primary rounded-xl">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold text-xl">Recall</span>
          </div>

          <div className="flex items-center gap-2">
            <ExportButton memories={memories} />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={cn(showHeatmap && 'bg-muted')}
            >
              <Calendar className="h-5 w-5" />
            </Button>
            <ThemeToggle />
            <span className="text-sm text-muted-foreground hidden sm:block ml-2">
              {user?.email}
            </span>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar with Collections */}
        {showSidebar && (
          <aside className="hidden md:block w-64 border-r border-border min-h-[calc(100vh-4rem)] p-4 bg-card/50">
            <CollectionManager
              collections={collections}
              selectedCollection={selectedCollection}
              onSelectCollection={setSelectedCollection}
              onCreateCollection={createCollection}
              onUpdateCollection={updateCollection}
              onDeleteCollection={deleteCollection}
              getMemoryCount={(id) => getMemoriesInCollection(id).length}
            />
          </aside>
        )}

        {/* Main content */}
        <main className={cn(
          "flex-1 px-4 py-8 mx-auto",
          showSidebar ? "max-w-4xl" : "max-w-5xl container"
        )}>
          {/* Activity Heatmap */}
          {showHeatmap && (
            <section className="mb-8 p-4 bg-card border border-border rounded-xl animate-fade-in">
              <ActivityHeatmap
                memories={memories}
                onDateClick={handleDateClick}
              />
            </section>
          )}

          {/* Hero search section */}
          <section className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
              What are you looking for?
            </h1>
            <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
              Search across all your memories using natural language. Ask anything and find it instantly.
            </p>
            
            {/* Search mode toggle */}
            <div className="flex justify-center mb-4">
              <SearchModeToggle mode={searchMode} onChange={setSearchMode} />
            </div>
            
            <div className="max-w-2xl mx-auto">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                onSearch={handleSearch}
                placeholder={
                  searchMode === 'semantic'
                    ? "Search your memories... e.g. 'that internship screenshot' or 'notes about React'"
                    : "Search by exact keywords..."
                }
                isSearching={isSearching}
                size="hero"
              />
            </div>
            
            {searchMode === 'semantic' && (
              <p className="text-xs text-muted-foreground mt-2">
                ✨ Semantic search understands meaning and finds synonyms
              </p>
            )}
          </section>

          {/* Search Results */}
          {showSearchResults && (
            <section className="mb-12">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-display font-semibold">
                  {isSearching ? 'Searching...' : `Found ${searchResults.length} results`}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                  }}
                >
                  Clear search
                </Button>
              </div>
              {isSearching ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-3">
                  {searchResults.map((result, index) => (
                    <div
                      key={result.chunk_id}
                      className="animate-slide-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {result.memory && (
                        <MemoryCard
                          memory={result.memory}
                          onDelete={deleteMemory}
                          onClick={() => handleMemoryClick(result.memory!)}
                          highlighted
                          highlightText={searchQuery}
                          collections={collections}
                          memoryCollectionIds={getCollectionsForMemory(result.memory.id).map(c => c.id)}
                          onAddToCollection={async (mId, cId) => { await addMemoryToCollection(mId, cId); }}
                          onRemoveFromCollection={async (mId, cId) => { await removeMemoryFromCollection(mId, cId); }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Main Tabs */}
          {!showSearchResults && (
            <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as typeof mainTab)} className="w-full">
              <TabsList className="mb-6 grid w-full grid-cols-3">
                <TabsTrigger value="memories" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Memories
                </TabsTrigger>
                <TabsTrigger value="decisions" className="gap-2">
                  <Scale className="h-4 w-4" />
                  Decisions
                </TabsTrigger>
                <TabsTrigger value="ai-tools" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  AI Tools
                </TabsTrigger>
              </TabsList>

              {/* Memories Tab */}
              <TabsContent value="memories">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-display font-semibold mb-1">
                      {selectedCollection 
                        ? collections.find(c => c.id === selectedCollection)?.name || 'Collection'
                        : 'Your Memories'
                      }
                    </h2>
                    <p className="text-muted-foreground">
                      {displayedCount} of {totalCount} memories
                      {selectedDate && ` on ${format(selectedDate, 'MMM d, yyyy')}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <AddMemoryModal onAdd={createMemory} />
                    <Button 
                      variant="outline" 
                      onClick={handleSeedData}
                      disabled={seedingData}
                      className="gap-2"
                    >
                      {seedingData ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {forceAddDemo ? 'Add Anyway' : 'Add Demo Data'}
                    </Button>
                  </div>
                </div>

                {/* Active filters */}
                {(selectedDate || selectedTags.length > 0) && (
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    {selectedDate && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearDateFilter}
                        className="gap-1"
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        {format(selectedDate, 'MMM d, yyyy')}
                        <X className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    )}
                  </div>
                )}

                {/* Tag filter */}
                <TagFilter
                  memories={memories}
                  selectedTags={selectedTags}
                  onTagSelect={handleTagSelect}
                  onTagDeselect={handleTagDeselect}
                  onClear={clearTagFilter}
                  className="mb-6"
                />

                {/* Filter tabs */}
                <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                  {filterOptions.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setActiveFilter(value)}
                      className={cn(
                        'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                        activeFilter === value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      )}
                    >
                      {Icon && <Icon className="h-4 w-4" />}
                      {label}
                    </button>
                  ))}
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <MemoryTimeline
                      memories={displayedMemories.filter(m => m.type !== 'decision')}
                      onDelete={deleteMemory}
                      onMemoryClick={handleMemoryClick}
                      filterType={activeFilter}
                      collections={collections}
                      getCollectionsForMemory={getCollectionsForMemory}
                      onAddToCollection={addMemoryToCollection}
                      onRemoveFromCollection={removeMemoryFromCollection}
                    />
                    
                    {/* Infinite scroll trigger */}
                    {hasMore && (
                      <div 
                        ref={setLoadMoreTarget} 
                        className="flex items-center justify-center py-8"
                      >
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              {/* Decisions Tab */}
              <TabsContent value="decisions">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-display font-semibold mb-1">Decision Journal</h2>
                    <p className="text-muted-foreground">
                      Track your decisions, learn from outcomes
                    </p>
                  </div>
                  <AddDecisionModal onAdd={createDecision} />
                </div>

                <div className="space-y-3">
                  {memories
                    .filter(m => m.type === 'decision')
                    .map((memory) => (
                      <DecisionCard
                        key={memory.id}
                        memory={memory}
                        onClick={() => handleDecisionClick(memory)}
                      />
                    ))}
                  
                  {memories.filter(m => m.type === 'decision').length === 0 && (
                    <div className="text-center py-16">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                        <Scale className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">No decisions logged yet</h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        Start logging your decisions with reasoning and alternatives. 
                        Later, you can track how they turned out!
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* AI Tools Tab */}
              <TabsContent value="ai-tools">
                {/* Index Memories for Search */}
                <div className="mb-6 p-4 bg-muted/50 border border-border rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" />
                        Enable Semantic Search
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Process your memories to enable AI-powered semantic search
                      </p>
                    </div>
                    <Button
                      onClick={handleBatchProcess}
                      disabled={processingEmbeddings}
                      className="gap-2"
                    >
                      {processingEmbeddings ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4" />
                          Generate Embeddings
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Explain With Notes */}
                  <div className="p-6 bg-card border border-border rounded-xl">
                    <ExplainWithNotesPanel />
                  </div>

                  {/* Compression */}
                  <div className="p-6 bg-card border border-border rounded-xl">
                    <CompressionPanel 
                      memories={memories} 
                      onCompress={handleCompressMemory} 
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </main>
      </div>

      {/* AI Chat Button */}
      <AIChatButton />

      {/* Memory Detail Drawer */}
      <MemoryDetailDrawer
        memory={selectedMemory}
        open={detailDrawerOpen}
        onOpenChange={setDetailDrawerOpen}
        onEdit={handleEditClick}
        onDelete={deleteMemory}
      />

      {/* Edit Memory Modal */}
      <EditMemoryModal
        memory={editingMemory}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onSave={handleSaveEdit}
      />

      {/* Decision Detail Drawer */}
      <DecisionDetailDrawer
        memory={selectedDecision}
        open={decisionDrawerOpen}
        onOpenChange={setDecisionDrawerOpen}
        onUpdateOutcome={handleUpdateDecisionOutcome}
      />
    </div>
  );
}
