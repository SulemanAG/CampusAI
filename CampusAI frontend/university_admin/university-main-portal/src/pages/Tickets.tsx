import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { User, Sparkles } from "lucide-react";
import { GlowingCard } from "@/components/ui/glowing-card";
import { BackgroundGlow } from "@/components/ui/background-glow";

interface Ticket {
  id: string;
  studentName: string;
  email: string;
  problem: string;
  location: string;
  time: string;
  status: "pending" | "completed";
  solution?: string;
}

const mockTickets: Ticket[] = [
  {
    id: "T001",
    studentName: "Rahul Verma",
    email: "rahul.v@college.edu",
    problem: "Grade discrepancy in Calculus II mid-term results. I scored 45 but portal shows 35.",
    location: "Mathematics Department",
    time: "2024-03-10 10:30 AM",
    status: "pending",
  },
  {
    id: "T002",
    studentName: "Sneha Gupta",
    email: "sneha.g@college.edu",
    problem: "Ceiling fan in Hostel Room 304 (Block A) is making loud noise and wobbling.",
    location: "Girls Hostel Block A",
    time: "2024-03-11 09:15 AM",
    status: "pending",
  },
  {
    id: "T003",
    studentName: "Ankit Roy",
    email: "ankit.r@college.edu",
    problem: "Library fine waiver request for late return due to medical emergency.",
    location: "Central Library",
    time: "2024-03-09 02:20 PM",
    status: "completed",
    solution: "Fine waived after verification of medical certificate.",
  },
  {
    id: "T004",
    studentName: "Pooja Naik",
    email: "pooja.n@college.edu",
    problem: "Request for makeup lab session for Physics Experiment 4 as I missed it due to sports event.",
    location: "Physics Lab 2",
    time: "2024-03-12 11:00 AM",
    status: "pending",
  },
  {
    id: "T005",
    studentName: "Arun Kumar",
    email: "arun.k@college.edu",
    problem: "College Bus Pass renewal application is stuck in 'Processing' for 2 weeks.",
    location: "Transport Office",
    time: "2024-03-12 04:15 PM",
    status: "pending",
  },
];

const smartSolveTickets = [
  {
    id: 1,
    problem: "Projector Display Issue - The projector in Lecture Hall 3 has a persistent purple tint and flickers intermittently. It is making it difficult for students to read the slides during lectures. Please check the VGA/HDMI cable connections or replace the bulb.",
    location: "Lecture Hall 3"
  },
  { id: 2, problem: "Water Cooler Leaking on 2nd Floor Corridor", location: "Main Building, 2nd Floor" },
  { id: 3, problem: "Broken Student Bench in Class 405", location: "ECE Dept, 4th Floor" },
  { id: 4, problem: "Lab PC 24 Not Booting (Blue Screen)", location: "Computer Lab 2" },
  { id: 5, problem: "Mess Food Hygiene Complaint - Insects found", location: "Boys Hostel Mess" },
  { id: 6, problem: "AC Not Cooling in Seminar Hall A", location: "Seminar Hall A" },
];

const Tickets = () => {
  const [tickets, setTickets] = useState<Ticket[]>(mockTickets);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [solution, setSolution] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [userDepartment, setUserDepartment] = useState<string>("Department");
  const [smartSolveDialogOpen, setSmartSolveDialogOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardSolutions, setWizardSolutions] = useState<string[]>(new Array(6).fill(""));
  const [activeTab, setActiveTab] = useState("pending");

  useEffect(() => {
    const dept = localStorage.getItem("userDepartment");
    if (dept) {
      setUserDepartment(dept.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" "));
    }
  }, []);

  const pendingTickets = tickets.filter((t) => t.status === "pending");
  const completedTickets = tickets.filter((t) => t.status === "completed");

  const handleSolveClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setSolution(ticket.solution || "");
    setDialogOpen(true);
  };

  const handleSubmitSolution = () => {
    if (selectedTicket && solution.trim()) {
      setTickets((prev) =>
        prev.map((t) =>
          t.id === selectedTicket.id
            ? { ...t, status: "completed" as const, solution: solution.trim() }
            : t
        )
      );
      setDialogOpen(false);
      setSolution("");
      setSelectedTicket(null);
    }
  };

  const handleSmartSolve = () => {
    setSmartSolveDialogOpen(true);
  };

  const handleStartWizard = () => {
    setSmartSolveDialogOpen(false);
    setWizardOpen(true);
    setCurrentStep(0);
    setWizardSolutions(new Array(6).fill(""));
  };

  const handleWizardNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleWizardPrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleWizardSubmit = () => {
    const newCompletedTickets: Ticket[] = smartSolveTickets.map((t, index) => ({
      id: `S${t.id.toString().padStart(3, '0')}`,
      studentName: "Smart Solve System",
      email: "system@smartsolve.edu",
      problem: t.problem,
      location: t.location,
      time: new Date().toLocaleString(),
      status: "completed",
      solution: wizardSolutions[index],
    }));

    setTickets((prev) => [...prev, ...newCompletedTickets]);
    setWizardOpen(false);
    setSmartSolveDialogOpen(false);
    setWizardSolutions(new Array(6).fill(""));
    setCurrentStep(0);
  };

  const handleSolutionChange = (value: string) => {
    const newSolutions = [...wizardSolutions];
    newSolutions[currentStep] = value;
    setWizardSolutions(newSolutions);
  };

  const TicketCard = ({ ticket }: { ticket: Ticket }) => (
    <GlowingCard className="h-full flex flex-col p-0">
      <CardContent className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">{ticket.studentName}</p>
              <p className="text-xs text-muted-foreground">{ticket.email}</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {ticket.id}
          </Badge>
        </div>

        <div className="mb-4 flex-1">
          <p className="text-sm text-foreground line-clamp-3">
            {ticket.problem}
          </p>
        </div>

        <div className="flex items-end justify-between mt-auto pt-2">
          <p className="text-xs text-muted-foreground">{ticket.location}</p>
          {ticket.status === "pending" && pendingTickets.length < 4 && (
            <Button
              size="sm"
              onClick={() => handleSolveClick(ticket)}
              className="hover:scale-105 transition-transform ml-auto"
            >
              Solve
            </Button>
          )}
        </div>
      </CardContent>
    </GlowingCard>
  );



  if (wizardOpen) {
    return (
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
        <div className="w-full max-w-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-2 shadow-sm ring-1 ring-primary/20">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">Smart Solve Assistant</h2>
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <span className="text-sm font-medium">Ticket {currentStep + 1} of 6</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full max-w-xs mx-auto h-1.5 bg-muted rounded-full overflow-hidden mt-4">
              <div
                className="h-full bg-primary transition-all duration-500 ease-in-out"
                style={{ width: `${((currentStep + 1) / 6) * 100}%` }}
              />
            </div>
          </div>

          <Card className="border-border/50 shadow-2xl bg-card/80 backdrop-blur-md overflow-hidden">
            <CardContent className="p-0">
              <div className="p-6 bg-muted/30 border-b border-border/50">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Problem Statement</span>
                  <Badge variant="outline" className="font-mono text-xs bg-background/50">
                    ID: T10{smartSolveTickets[currentStep].id}
                  </Badge>
                </div>
                <div className="relative pl-4 border-l-4 border-primary/50 py-1">
                  {/* Quote Icon Background */}
                  <span className="absolute -top-2 -left-3 text-6xl text-primary/5 font-serif select-none pointer-events-none">"</span>
                  <p className="text-lg font-medium leading-relaxed text-foreground/90 italic">
                    {smartSolveTickets[currentStep].problem}
                  </p>
                </div>

              </div>

              <div className="p-6 space-y-4 bg-card">
                <div className="space-y-2">
                  <Label htmlFor={`solution-${currentStep}`} className="text-sm font-semibold flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                    Proposed Solution
                  </Label>
                  <Textarea
                    id={`solution-${currentStep}`}
                    placeholder="Type your professional resolution here..."
                    value={wizardSolutions[currentStep]}
                    onChange={(e) => handleSolutionChange(e.target.value)}
                    className="min-h-[150px] text-base p-4 resize-none transition-all focus-visible:ring-2 focus-visible:ring-primary/20 border-muted-foreground/20 hover:border-primary/50 bg-background"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground text-right">{wizardSolutions[currentStep].length} characters</p>
                </div>

                <div className="flex justify-between pt-2">
                  <Button
                    variant="ghost"
                    onClick={handleWizardPrevious}
                    disabled={currentStep === 0}
                    className="gap-2"
                  >
                    Previous
                  </Button>

                  {currentStep < 5 ? (
                    <Button
                      onClick={handleWizardNext}
                      disabled={!wizardSolutions[currentStep].trim()}
                      className="px-8 shadow-md hover:shadow-lg transition-all"
                    >
                      Next Ticket
                    </Button>
                  ) : (
                    <Button
                      onClick={handleWizardSubmit}
                      disabled={!wizardSolutions[currentStep].trim()}
                      className="px-8 bg-green-600 hover:bg-green-700 shadow-md hover:shadow-green-900/20 transition-all"
                    >
                      Finish Smart Solve
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <Button variant="link" className="text-muted-foreground/60 hover:text-destructive transition-colors text-xs" onClick={() => setWizardOpen(false)}>
              Exit Smart Solve Mode
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-background/60 px-6 glass">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-primary">Department</span>
              <span className="text-muted-foreground">•</span>
              <h1 className="text-2xl font-bold tracking-tight">Tickets</h1>
            </div>
            <div className="flex-1" />
            <ThemeToggle />
          </header>

          <main className="flex-1 p-6 relative">
            <BackgroundGlow />
            <div className="space-y-6 mb-20 relative z-10">

              <Tabs defaultValue="pending" className="w-full" onValueChange={setActiveTab}>
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="pending">
                    Pending ({pendingTickets.length})
                  </TabsTrigger>
                  <TabsTrigger value="completed">
                    Completed ({completedTickets.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="space-y-4 mt-6">
                  {pendingTickets.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {pendingTickets.map((ticket) => (
                        <TicketCard key={ticket.id} ticket={ticket} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      No pending tickets
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="completed" className="space-y-4 mt-6">
                  {completedTickets.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {completedTickets.map((ticket) => (
                        <TicketCard key={ticket.id} ticket={ticket} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      No completed tickets
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Smart Solve Button */}
            {activeTab === "pending" && pendingTickets.length >= 4 && (
              <div className="relative z-10">
                <Button
                  onClick={handleSmartSolve}
                  className="fixed bottom-8 right-8 h-14 px-6 shadow-lg hover:shadow-xl transition-all hover:scale-105"
                  size="lg"
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  Smart Solve
                </Button>
              </div>
            )}


          </main>
        </div>
      </div>

      {/* Solve Ticket Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl glass-panel">
          <DialogHeader>
            <DialogTitle>Ticket Details - {selectedTicket?.id}</DialogTitle>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{selectedTicket.studentName}</p>
                  <p className="text-sm text-muted-foreground">{selectedTicket.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Ticket ID</Label>
                  <p className="font-medium">{selectedTicket.id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Time</Label>
                  <p className="font-medium">{selectedTicket.time}</p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Location</Label>
                <p className="font-medium">{selectedTicket.location}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">Problem</Label>
                <p className="text-sm mt-1">{selectedTicket.problem}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="solution">Solution *</Label>
                <Textarea
                  id="solution"
                  placeholder="Enter the solution details..."
                  value={solution}
                  onChange={(e) => setSolution(e.target.value)}
                  className="min-h-[120px]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    setSolution("");
                    setSelectedTicket(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitSolution}
                  disabled={!solution.trim()}
                >
                  Submit
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Smart Solve Dialog */}
      <Dialog open={smartSolveDialogOpen} onOpenChange={setSmartSolveDialogOpen}>
        <DialogContent className="max-w-md text-center glass-panel">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Smart Solve
            </DialogTitle>
          </DialogHeader>

          <div className="py-6">
            <p className="text-lg font-medium leading-relaxed">
              Just solve following <span className="text-primary font-bold">6 out of 10</span> tickets remaining will be solved automatically
            </p>
          </div>

          <div className="flex justify-center pb-2">
            <Button
              size="lg"
              className="px-8 font-bold text-md"
              onClick={handleStartWizard}
            >
              Start
            </Button>
          </div>
        </DialogContent>
      </Dialog>


    </SidebarProvider >
  );
};

export default Tickets;
