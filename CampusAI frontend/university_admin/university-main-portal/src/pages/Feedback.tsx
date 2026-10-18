import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Star, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlowingCard } from "@/components/ui/glowing-card";
import { startOfWeek, subWeeks, startOfMonth, isAfter, isBefore, parseISO } from "date-fns";
import { BackgroundGlow } from "@/components/ui/background-glow";

interface FeedbackItem {
  id: string;
  citizenName: string;
  email: string;
  feedback: string;
  rating: number;
  date: string; // ISO format for easier parsing
  location: string;
}

// Mock Data
const mockFeedbacks: FeedbackItem[] = [
  {
    id: "F001",
    citizenName: "Rajesh Kumar",
    email: "rajesh.kumar@university.edu",
    feedback: "The new online fee payment system is very smooth. Much better than the old one!",
    rating: 5,
    date: new Date().toISOString(), // Today
    location: "Main Admin Block",
  },
  {
    id: "F002",
    citizenName: "Priya Sharma",
    email: "priya.sharma@university.edu",
    feedback: "Mess food quality has been inconsistent this week. Please look into it.",
    rating: 2,
    date: subWeeks(new Date(), 0).toISOString(), // This week
    location: "Girls Hostel Block A",
  },
  {
    id: "F003",
    citizenName: "Amit Patel",
    email: "amit.patel@university.edu",
    feedback: "Wi-Fi in the hostel was fixed within 24 hours. Great job!",
    rating: 5,
    date: subWeeks(new Date(), 1).toISOString(), // Previous week
    location: "Boys Hostel Block B",
  },
  {
    id: "F004",
    citizenName: "Sarah Wilson",
    email: "sarah.wilson@university.edu",
    feedback: "The library maintenance is okay, but could be better. Some chairs are broken on the 2nd floor.",
    rating: 3,
    date: subWeeks(new Date(), 1).toISOString(), // Previous week
    location: "Central Library",
  },
  {
    id: "F005",
    citizenName: "Mike Brown",
    email: "mike.brown@university.edu",
    feedback: "Very disappointed with the response time for my broken lab equipment complaint.",
    rating: 1,
    date: startOfMonth(new Date()).toISOString(), // Start of this month
    location: "Mechanical Workshop",
  },
  {
    id: "F006",
    citizenName: "Anjali Desai",
    email: "anjali.desai@university.edu",
    feedback: "Love the new student center events! Great initiative by the cultural committee.",
    rating: 4,
    date: new Date().toISOString(),
    location: "Student Activity Center",
  },
  {
    id: "F007",
    citizenName: "David Lee",
    email: "david.lee@university.edu",
    feedback: "Water cooler on the 3rd floor was empty without notice.",
    rating: 1,
    date: subWeeks(new Date(), 2).toISOString(), // 2 weeks ago
    location: "CSE Department",
  },
  {
    id: "F008",
    citizenName: "Emma Garcia",
    email: "emma.garcia@university.edu",
    feedback: "Campus bus schedule is very accurate now. Thanks for adding more trips.",
    rating: 4,
    date: subWeeks(new Date(), 3).toISOString(), // 3 weeks ago
    location: "Bus Stop 1",
  },
  {
    id: "F009",
    citizenName: "John Doe",
    email: "john.doe@university.edu",
    feedback: "Noise from the new block construction is unbearable during lectures.",
    rating: 2,
    date: new Date().toISOString(),
    location: "Lecture Hall Complex",
  },
  {
    id: "F010",
    citizenName: "Jane Smith",
    email: "jane.smith@university.edu",
    feedback: "Excellent service at the admin office regarding scholarship query.",
    rating: 5,
    date: subWeeks(new Date(), 1).toISOString(),
    location: "Scholarship Section",
  }
];

const Feedback = () => {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>(mockFeedbacks);
  const [filteredFeedbacks, setFilteredFeedbacks] = useState<FeedbackItem[]>(mockFeedbacks);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<string>("all");
  const [userDepartment, setUserDepartment] = useState<string>("Department");
  const location = useLocation();

  // Reset filters when location changes (e.g. clicking sidebar link)
  useEffect(() => {
    setSelectedRating(null);
    setSelectedDuration("all");
  }, [location.key]);

  useEffect(() => {
    const dept = localStorage.getItem("userDepartment");
    if (dept) {
      setUserDepartment(dept.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" "));
    }
  }, []);

  // Filter Logic
  useEffect(() => {
    let result = feedbacks;

    // Rating Filter
    if (selectedRating !== null) {
      result = result.filter((f) => f.rating === selectedRating);
    }

    // Duration Filter
    const now = new Date();
    const startOfThisWeek = startOfWeek(now);
    const startOfLastWeek = subWeeks(startOfThisWeek, 1);
    const startOfThisMonth = startOfMonth(now);

    if (selectedDuration === "this-week") {
      result = result.filter((f) => isAfter(parseISO(f.date), startOfThisWeek));
    } else if (selectedDuration === "prev-week") {
      result = result.filter((f) =>
        isAfter(parseISO(f.date), startOfLastWeek) && isBefore(parseISO(f.date), startOfThisWeek)
      );
    } else if (selectedDuration === "this-month") {
      result = result.filter((f) => isAfter(parseISO(f.date), startOfThisMonth));
    }

    setFilteredFeedbacks(result);
  }, [selectedRating, selectedDuration, feedbacks]);

  const toggleRating = (rating: number) => {
    setSelectedRating((prev) => (prev === rating ? null : rating));
  };

  const getRatingColor = (rating: number) => {
    switch (rating) {
      case 1: return "bg-red-600 text-white hover:bg-red-700 border-red-600";
      case 2: return "bg-orange-500 text-white hover:bg-orange-600 border-orange-500";
      case 3: return "bg-yellow-500 text-black hover:bg-yellow-600 border-yellow-500";
      case 4: return "bg-green-500 text-white hover:bg-green-600 border-green-500";
      case 5: return "bg-green-700 text-white hover:bg-green-800 border-green-700";
      default: return "bg-gray-200 text-gray-800";
    }
  };

  const FeedbackCard = ({ feedback }: { feedback: FeedbackItem }) => (
    <GlowingCard className="h-full flex flex-col p-0">
      <CardContent className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">{feedback.citizenName}</p>
              <p className="text-xs text-muted-foreground">{feedback.email}</p>
            </div>
          </div>
          <Badge className={cn("flex items-center gap-1", getRatingColor(feedback.rating))}>
            {feedback.rating} <Star className="h-3 w-3 fill-current" />
          </Badge>
        </div>

        <div className="mb-4 flex-1">
          <p className="text-sm text-foreground line-clamp-3">
            "{feedback.feedback}"
          </p>
        </div>

        <div className="flex items-end justify-between mt-auto pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground">{feedback.location}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(feedback.date).toLocaleDateString()}
          </p>
        </div>
      </CardContent>
    </GlowingCard>
  );

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
              <h1 className="text-2xl font-bold tracking-tight">Feedback</h1>
            </div>
            <div className="flex-1" />
            <ThemeToggle />
          </header>

          <main className="flex-1 p-6 relative">
            <BackgroundGlow />
            <div className="relative z-10">
              {/* Filter Bar */}
              <div className="mb-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-card/50 p-4 rounded-lg border border-border/50 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Filter className="h-4 w-4" />
                    Filter by Rating:
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Button
                        key={star}
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRating(star)}
                        className={cn(
                          "h-8 w-8 p-0 rounded-full transition-all",
                          selectedRating === star
                            ? getRatingColor(star)
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        {star}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                    Duration:
                  </span>
                  <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="this-week">This Week</SelectItem>
                      <SelectItem value="prev-week">Previous Week</SelectItem>
                      <SelectItem value="this-month">This Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Feedback Grid */}
              {filteredFeedbacks.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredFeedbacks.map((feedback) => (
                    <FeedbackCard key={feedback.id} feedback={feedback} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground bg-card/30 rounded-lg border border-dashed border-border">
                  No feedback found matching your filters.
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Feedback;
