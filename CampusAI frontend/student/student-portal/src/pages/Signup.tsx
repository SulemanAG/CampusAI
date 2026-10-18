import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GlowingCard } from "@/components/ui/glowing-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, ArrowLeft, Check, School } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { studentApi } from "@/lib/api";

type SignupStep = "credentials" | "details" | "success";

interface NonPrimaryAccount {
  accountEmail: string;
  accountName: string;
  storeName: string;
}

const Signup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<SignupStep>("credentials");
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [selectedAccountEmail, setSelectedAccountEmail] = useState("");

  // Data from Step 1
  const [universityName, setUniversityName] = useState("");
  const [nonPrimaryAccounts, setNonPrimaryAccounts] = useState<NonPrimaryAccount[]>([]);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await studentApi.initiateRegistration(email, password);
      // Determine university name from response or email domain if possible, 
      // but response has universityName.
      setUniversityName(response.universityName);
      setNonPrimaryAccounts(response.nonPrimaryAccounts);
      setCurrentStep("details");
      toast({
        title: "Credentials Verified",
        description: response.message,
      });

      // Cache partial registration data if needed
      localStorage.setItem("partialRegistration", JSON.stringify({
        email,
        universityName: response.universityName,
        accounts: response.nonPrimaryAccounts
      }));

    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to initiate registration",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !selectedAccountEmail) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await studentApi.completeRegistration(email, name, selectedAccountEmail);

      // Store student data
      localStorage.setItem("studentData", JSON.stringify(response.student));
      localStorage.setItem("authToken", "true"); // Simple auth flag for now

      setCurrentStep("success");
      toast({
        title: "Success!",
        description: "Registration completed successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to complete registration",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case "credentials":
        return (
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Student University Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john.doe@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Verifying..." : "Continue"}
            </Button>
          </form>
        );

      case "details":
        return (
          <form onSubmit={handleDetailsSubmit} className="space-y-6">
            <div className="bg-primary/5 p-4 rounded-lg space-y-2 border border-primary/10">
              <div className="flex items-center gap-2 text-primary font-medium">
                <School className="h-4 w-4" />
                <span>{universityName}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Please complete your profile details.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Select Department (Non-Primary Account)</Label>
              <Select value={selectedAccountEmail} onValueChange={setSelectedAccountEmail} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select your department" />
                </SelectTrigger>
                <SelectContent>
                  {nonPrimaryAccounts.map((account) => (
                    <SelectItem key={account.accountEmail} value={account.accountEmail}>
                      {account.accountName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Completing Registration..." : "Complete Registration"}
            </Button>
          </form>
        );

      case "success":
        return (
          <div className="text-center py-8 space-y-6">
            <div className="flex justify-center">
              <div className="rounded-full bg-success/10 p-4">
                <Check className="h-12 w-12 text-success" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-success">Registration Successful!</h3>
              <p className="text-muted-foreground">
                Your account has been created. You can now login.
              </p>
            </div>
            <Button onClick={() => navigate("/users-end")} className="w-full">
              Enter Student Portal
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case "credentials":
        return "Student Registration";
      case "details":
        return "Complete Profile";
      case "success":
        return "Welcome Aboard!";
      default:
        return "";
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case "credentials":
        return "Enter your university email to get started";
      case "details":
        return "Select your department and enter your details";
      case "success":
        return "";
      default:
        return "";
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-4">
              <Shield className="h-10 w-10 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Student Portal</h1>
          <p className="text-muted-foreground">
            Join your university's smart campus network
          </p>
        </div>

        {/* Progress Indicator */}
        {currentStep !== "success" && (
          <div className="flex justify-center gap-2">
            {["credentials", "details"].map((step, index) => (
              <div
                key={step}
                className={`h-2 w-12 rounded-full transition-colors ${(currentStep === "details" && index === 0) || currentStep === step
                  ? "bg-primary"
                  : "bg-muted"
                  }`}
              />
            ))}
          </div>
        )}

        {/* Signup Card */}
        <GlowingCard className="p-0">
          <CardHeader>
            <CardTitle>{getStepTitle()}</CardTitle>
            <CardDescription>{getStepDescription()}</CardDescription>
          </CardHeader>
          <CardContent>{renderStepContent()}</CardContent>
        </GlowingCard>

        {/* Back Navigation */}
        {currentStep !== "success" && (
          <div className="text-center space-y-4">
            {currentStep === "credentials" && (
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto font-medium"
                  onClick={() => navigate("/login")}
                >
                  Sign in here
                </Button>
              </p>
            )}
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="text-muted-foreground"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Signup;
