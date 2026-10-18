import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Plus, Calendar, Clock, Upload, Edit2, Trash2, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { GlowingCard } from "@/components/ui/glowing-card";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { BackgroundGlow } from "@/components/ui/background-glow";

type ContentType = "notice" | "faq" | "important-date";

interface ContentItem {
  id: string;
  title: string;
  content: string;
  uploadDate: string;
  deleteDate: string;
  autoDelete: boolean;
  type: ContentType;
  fileName?: string;
}

const formatDepartment = (dept: string) => {
  return dept.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
};

const Notifications = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<ContentType>("notice");
  const [items, setItems] = useState<ContentItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [uploadDate, setUploadDate] = useState("");
  const [deleteDate, setDeleteDate] = useState<Date | undefined>(undefined);
  const [autoDelete, setAutoDelete] = useState(false);
  const [fileName, setFileName] = useState("");
  const [userDepartment, setUserDepartment] = useState<string>("Department");

  useEffect(() => {
    const dept = localStorage.getItem("userDepartment");
    if (dept) {
      setUserDepartment(formatDepartment(dept));
    }
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: ContentItem = {
      id: Date.now().toString(),
      title,
      content,
      uploadDate: new Date().toISOString(),
      deleteDate: deleteDate ? deleteDate.toISOString() : "",
      autoDelete,
      type: activeTab,
      fileName,
    };
    setItems([...items, newItem]);
    toast({
      title: "Added Successfully",
      description: `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} has been added.`
    });
    setIsDialogOpen(false);
    setTitle("");
    setContent("");
    setUploadDate("");
    setDeleteDate(undefined);
    setFileName("");
  };

  const handleDelete = (id: string) => {
    setItems(items.filter(item => item.id !== id));
    toast({ title: "Deleted", description: "Item has been removed." });
  };

  const filteredItems = items.filter(item => item.type === activeTab);

  const getButtonLabel = () => {
    switch (activeTab) {
      case "notice": return "Add New Notice";
      case "faq": return "Add New FAQ";
      case "important-date": return "Add Important Date";
      default: return "Add New";
    }
  };

  const getDialogTitle = () => {
    switch (activeTab) {
      case "notice": return "Add New Notice";
      case "faq": return "Add New FAQ";
      case "important-date": return "Add Important Date";
      default: return "Add New";
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-subtle">
        <AppSidebar />
        <main className="flex-1 relative">
          <div className="opacity-10">
            <BackgroundGlow />
          </div>
          <div className="relative z-10 min-h-full flex flex-col">
            <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/60 px-6 glass">
              <SidebarTrigger />
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-primary">Department</span>
                <span className="text-muted-foreground">•</span>
                <h1 className="text-2xl font-bold tracking-tight">Information Broadcast</h1>
              </div>
              <div className="flex-1" />
              <ThemeToggle />
            </header>
            <div className="p-6 space-y-6">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ContentType)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="notice">Notice</TabsTrigger>
                  <TabsTrigger value="faq">FAQ</TabsTrigger>
                  <TabsTrigger value="important-date">Important Data</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="space-y-4 mt-6">
                  {filteredItems.length === 0 ? (
                    <GlowingCard>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <p className="text-muted-foreground">No {activeTab}s added yet</p>
                      </CardContent>
                    </GlowingCard>
                  ) : (
                    <div className="grid gap-4">
                      {filteredItems.map((item) => (
                        <GlowingCard key={item.id} className="p-0">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-3">
                                  <h3 className="font-semibold text-lg">{item.title}</h3>
                                  {item.fileName && (
                                    <Badge variant="outline" className="text-xs">
                                      {item.fileName}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-muted-foreground text-sm">{item.content}</p>
                                <div className="flex gap-4 text-xs text-muted-foreground mt-3">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>Upload: {new Date(item.uploadDate).toLocaleDateString()}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <span>Delete: {new Date(item.deleteDate).toLocaleDateString()}</span>
                                  </div>
                                  {item.autoDelete && (
                                    <Badge variant="secondary" className="text-xs">Auto-Delete</Badge>
                                  )}
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>
                                    <Edit2 className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => handleDelete(item.id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </CardContent>
                        </GlowingCard>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Floating Action Button */}
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="fixed bottom-8 right-8 h-14 px-6 rounded-full shadow-lg"
              size="lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              {getButtonLabel()}
            </Button>

            {/* Add Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-xl border-border shadow-2xl">
                <DialogHeader>
                  <DialogTitle>{getDialogTitle()}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddItem} className="space-y-6">
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      placeholder="Enter title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Content *</Label>
                    <Textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={4}
                      required
                      placeholder="Enter content"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Upload File (Optional)</Label>
                    <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${fileName ? 'border-green-500 bg-green-50/10' : 'border-border hover:border-primary'}`}>
                      <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                      <label htmlFor="file-upload" className="cursor-pointer w-full h-full block">
                        <Upload className={`h-8 w-8 mx-auto mb-2 ${fileName ? 'text-green-500' : 'text-muted-foreground'}`} />
                        <p className={`text-sm ${fileName ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
                          {fileName || "Drag and drop or click to select"}
                        </p>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="auto-delete" className="cursor-pointer font-medium">Enable Auto-deletion</Label>
                        <Switch
                          id="auto-delete"
                          checked={autoDelete}
                          onCheckedChange={setAutoDelete}
                        />
                      </div>
                    </div>

                    {autoDelete && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <Label className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Select Deletion Time
                        </Label>
                        <DateTimePicker
                          date={deleteDate}
                          setDate={setDeleteDate}
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>

                  <Button type="submit" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Notifications;
