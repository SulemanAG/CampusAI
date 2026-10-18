import { useState, useEffect } from "react";
import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Ticket as TicketIcon, Plus, ChevronRight, Check, MoreVertical, Trash, Calendar, Building2 } from "lucide-react";
import { GlowingCard } from "@/components/ui/glowing-card";
import { studentApi, Ticket, AccessibleAccount } from "@/lib/api";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";

const UserTickets = () => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Create Ticket State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [accessibleAccounts, setAccessibleAccounts] = useState<AccessibleAccount[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<AccessibleAccount | null>(null);
    const [problemDescription, setProblemDescription] = useState("");
    const [creationStep, setCreationStep] = useState<"select-dept" | "describe-problem">("select-dept");
    const [isCreating, setIsCreating] = useState(false);

    // Delete State
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    const loadTickets = async () => {
        const studentDataStr = localStorage.getItem("studentData");
        if (!studentDataStr) {
            setError("No student session found.");
            setLoading(false);
            return;
        }
        try {
            const student = JSON.parse(studentDataStr);
            if (!student.email) throw new Error("Email missing");
            const response = await studentApi.getTickets(student.email);
            setTickets(response.tickets || []);
        } catch (err: any) {
            console.error("Failed to fetch tickets", err);
            // Don't show hard error screen for fetch failure, just show empty
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTickets();
    }, []);

    const handleOpenCreate = async () => {
        setIsCreateOpen(true);
        setCreationStep("select-dept");
        setSelectedAccount(null);
        setProblemDescription("");

        // Fetch accessible accounts
        try {
            const studentDataStr = localStorage.getItem("studentData");
            if (studentDataStr) {
                const student = JSON.parse(studentDataStr);
                const response = await studentApi.getAccessibleAccounts(student.email);
                setAccessibleAccounts(response.accounts || []);
            }
        } catch (e) {
            console.error("Failed to load accessible accounts", e);
            toast({
                title: "Error",
                description: "Failed to load departments. Please try again.",
                variant: "destructive"
            });
            setIsCreateOpen(false);
        }
    };

    const handleCreateTicket = async () => {
        if (!selectedAccount || !problemDescription.trim()) return;
        setIsCreating(true);

        try {
            const studentDataStr = localStorage.getItem("studentData");
            if (!studentDataStr) throw new Error("No session");
            const student = JSON.parse(studentDataStr);

            await studentApi.createTicket(student.email, selectedAccount.accountEmail, problemDescription);

            toast({
                title: "Ticket Created Status: Pending",
                description: "Your support request has been submitted successfully.",
            });

            setIsCreateOpen(false);
            loadTickets(); // Refresh list
        } catch (e: any) {
            toast({
                title: "Failed to create ticket",
                description: e.message,
                variant: "destructive"
            });
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteTicket = async (ticketId: string) => {
        setIsDeleting(ticketId);
        try {
            const studentDataStr = localStorage.getItem("studentData");
            if (!studentDataStr) throw new Error("No session");
            const student = JSON.parse(studentDataStr);

            await studentApi.deleteTicket(student.email, ticketId);

            toast({
                title: "Ticket Deleted",
                description: "The ticket has been successfully removed.",
            });
            loadTickets(); // Refresh list
        } catch (e: any) {
            toast({
                title: "Failed to delete ticket",
                description: e.message,
                variant: "destructive"
            });
        } finally {
            setIsDeleting(null);
        }
    };

    const pendingTickets = tickets.filter((t) => t.status === "pending" || t.status === "in_progress");
    const completedTickets = tickets.filter((t) => t.status === "completed");

    const TicketCard = ({ ticket }: { ticket: Ticket }) => (
        <GlowingCard className="h-full flex flex-col p-0 glass hover:scale-[1.01] transition-transform duration-200 group relative">
            <CardContent className="p-6 flex flex-col flex-1">
                {/* Header Section */}
                <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-3 w-full pr-10">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                            <TicketIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="overflow-hidden space-y-0.5">
                            <p className="font-semibold text-sm truncate tracking-tight">#{ticket.ticketId.slice(-8).toUpperCase()}</p>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Building2 className="w-3 h-3" />
                                <span className="truncate">{ticket.accountEmail}</span>
                            </div>
                        </div>
                    </div>

                    <div className="absolute top-4 right-4 z-10">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-secondary rounded-full data-[state=open]:bg-secondary">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem
                                    onClick={() => handleDeleteTicket(ticket.ticketId)}
                                    className="text-red-500 hover:text-red-600 hover:bg-red-100 focus:text-red-600 focus:bg-red-50"
                                    disabled={isDeleting === ticket.ticketId}
                                >
                                    <Trash className="mr-2 h-4 w-4" />
                                    {isDeleting === ticket.ticketId ? 'Deleting...' : 'Delete'}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Status Badge */}
                <div className="mb-4">
                    <Badge variant={ticket.status === 'completed' ? 'secondary' : 'outline'}
                        className={`
                            ${ticket.status === 'pending' ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/30' : ''}
                            ${ticket.status === 'in_progress' ? 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/30' : ''}
                            ${ticket.status === 'completed' ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/30' : ''}
                            capitalize px-3 py-1 font-medium
                        `}
                    >
                        {ticket.status.replace('_', ' ')}
                    </Badge>
                </div>

                {/* Problem Description */}
                <div className="flex-1 space-y-4">
                    <div className="bg-muted/30 p-4 rounded-xl border border-border/40">
                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide opacity-70">Issue Description</p>
                        <p className="text-sm text-foreground leading-relaxed">
                            {ticket.problem}
                        </p>
                    </div>

                    {ticket.solution && (
                        <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 animate-in fade-in slide-in-from-top-2">
                            <p className="text-xs font-semibold text-primary mb-2 uppercase tracking-wide opacity-90">Resolution</p>
                            <p className="text-sm text-foreground/90 leading-relaxed">{ticket.solution}</p>
                        </div>
                    )}
                </div>

                {/* Footer Date */}
                <div className="flex items-center gap-2 mt-6 pt-4 border-t border-border/40 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    <p className="text-xs font-medium">
                        {ticket.createdAt ? format(new Date(ticket.createdAt), 'MMM d, yyyy • h:mm a') : 'N/A'}
                    </p>
                </div>
            </CardContent>
        </GlowingCard>
    );

    return (
        <div className="w-full max-w-7xl mx-auto p-4 md:p-6 h-full overflow-y-auto pb-24">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight mb-2">Support Tickets</h2>
                    <p className="text-muted-foreground text-lg">Manage your support requests and track their status.</p>
                </div>
                <Button onClick={handleOpenCreate} size="lg" className="rounded-full gap-2 shadow-lg hover:shadow-primary/25 transition-all bg-primary text-primary-foreground">
                    <Plus className="h-5 w-5" />
                    New Ticket
                </Button>
            </div>

            <Tabs defaultValue="pending" className="w-full">
                <div className="border-b border-border/40 mb-8">
                    <TabsList className="bg-transparent p-0 gap-8">
                        <TabsTrigger
                            value="pending"
                            className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-none px-2 pb-3 mb-[-1px] text-muted-foreground hover:text-foreground transition-colors text-base"
                        >
                            Active <span className="ml-2 bg-muted text-foreground text-xs rounded-full px-2 py-0.5">{pendingTickets.length}</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="completed"
                            className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-none px-2 pb-3 mb-[-1px] text-muted-foreground hover:text-foreground transition-colors text-base"
                        >
                            Resolved <span className="ml-2 bg-muted text-foreground text-xs rounded-full px-2 py-0.5">{completedTickets.length}</span>
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="pending" className="m-0 animate-in fade-in slide-in-from-bottom-4 duration-500 focus-visible:outline-none">
                    {loading ? (
                        <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div>
                    ) : pendingTickets.length > 0 ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                            {pendingTickets.map((ticket) => (
                                <TicketCard key={ticket.ticketId} ticket={ticket} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground bg-muted/5 rounded-2xl border border-dashed border-border text-center">
                            <div className="bg-muted/20 p-4 rounded-full mb-4">
                                <TicketIcon className="h-12 w-12 opacity-30" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">No active tickets</h3>
                            <p className="text-muted-foreground max-w-sm">You don't have any open support requests. If you need help, create a new ticket.</p>
                            <Button variant="outline" onClick={handleOpenCreate} className="mt-6 gap-2">
                                <Plus className="w-4 h-4" /> Create Ticket
                            </Button>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="completed" className="m-0 animate-in fade-in slide-in-from-bottom-4 duration-500 focus-visible:outline-none">
                    {loading ? (
                        <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div>
                    ) : completedTickets.length > 0 ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                            {completedTickets.map((ticket) => (
                                <TicketCard key={ticket.ticketId} ticket={ticket} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground bg-muted/5 rounded-2xl border border-dashed border-border">
                            <div className="bg-muted/20 p-4 rounded-full mb-4">
                                <Check className="h-12 w-12 opacity-30" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">No history</h3>
                            <p className="text-muted-foreground">You haven't resolved any tickets yet.</p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Create Ticket Dialog - Keeping functionality, updating style slightly if needed */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-[550px] overflow-hidden gap-0 rounded-2xl shadow-2xl border-border/50">
                    <DialogHeader className="p-8 pb-4 bg-muted/5">
                        <DialogTitle className="text-2xl">Create Support Ticket</DialogTitle>
                        <DialogDescription className="text-base">
                            {creationStep === 'select-dept' ? 'Which department should handle this request?' : 'Tell us more about the issue you are facing.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-8 pt-4">
                        {creationStep === 'select-dept' ? (
                            <ScrollArea className="h-[320px] pr-2 -mr-2">
                                <div className="space-y-3">
                                    {accessibleAccounts.map((account) => (
                                        <div
                                            key={account.accountEmail}
                                            onClick={() => {
                                                setSelectedAccount(account);
                                                setCreationStep("describe-problem");
                                            }}
                                            className="group flex items-center justify-between p-4 rounded-xl border border-border/50 hover:border-primary/50 hover:bg-primary/[0.03] hover:shadow-sm cursor-pointer transition-all duration-200"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                                    <span className="text-sm font-bold text-muted-foreground group-hover:text-primary transition-colors">
                                                        {account.accountName.substring(0, 2).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-base group-hover:text-primary transition-colors">{account.accountName}</p>
                                                    <p className="text-sm text-muted-foreground">{account.accountEmail}</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                                        </div>
                                    ))}
                                    {accessibleAccounts.length === 0 && (
                                        <div className="text-center py-12">
                                            <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                                            <p className="text-muted-foreground font-medium">No accessible departments found.</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        ) : (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
                                <div className="p-4 bg-secondary/30 rounded-xl flex items-center gap-4 border border-border/50">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <Check className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="overflow-hidden flex-1">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Selected Department</p>
                                        <p className="text-base font-semibold truncate">{selectedAccount?.accountName}</p>
                                    </div>
                                    <Button variant="ghost" size="sm" className="h-8 text-xs font-medium hover:bg-background" onClick={() => setCreationStep("select-dept")}>Change</Button>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        Problem Description <span className="text-red-500">*</span>
                                    </label>
                                    <Textarea
                                        placeholder="Please provide details about your issue..."
                                        className="min-h-[160px] resize-none focus-visible:ring-primary text-base p-4 rounded-xl"
                                        value={problemDescription}
                                        onChange={(e) => setProblemDescription(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="p-8 pt-0 flex items-center justify-between border-t border-border/40 bg-muted/5 mt-auto h-20">
                        {creationStep === 'select-dept' ? (
                            <Button variant="ghost" className="hover:bg-transparent hover:text-foreground" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        ) : (
                            <>
                                <Button variant="ghost" onClick={() => setCreationStep("select-dept")}>Back</Button>
                                <Button size="lg" className="px-8 shadow-md" onClick={handleCreateTicket} disabled={!problemDescription.trim() || isCreating}>
                                    {isCreating ? "Creating..." : "Create Ticket"}
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default UserTickets;
