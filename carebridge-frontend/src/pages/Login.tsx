import { useState, useEffect, type ChangeEvent } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, ArrowLeft } from "lucide-react";

const roles = [
  { 
    value: "PATIENT", 
    label: "Patient", 
    description: "Receive diagnoses and expert suggestions.",
    quote: "Your health is your wealth. Start your journey today.",
    image: "https://images.unsplash.com/photo-1576091160550-112173f7f869?w=1200&h=1400&fit=crop"
  },
  { 
    value: "THERAPIST", 
    label: "Therapist", 
    description: "Offer care plans across multiple specializations.",
    quote: "Healing is a privilege. Make a difference in lives.",
    image: "https://images.unsplash.com/photo-1576091160650-2173dba999ef?w=1200&h=1400&fit=crop"
  },
  { 
    value: "HOSPITAL", 
    label: "Hospital", 
    description: "Manage hospital offers and patient referrals.",
    quote: "Excellence in care delivery. Serve with purpose.",
    image: "https://images.unsplash.com/photo-1576091160653-f173d7d408f5?w=1200&h=1400&fit=crop"
  },
];

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("PATIENT");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const currentRole = roles.find(r => r.value === role);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await axios.post(`${API_BASE}/api/auth/login`, {
        email,
        password,
      });

      const token = res.data.token;
      localStorage.setItem("token", token);
      localStorage.setItem("userEmail", email);

      // Automatically extract actual role from token if present, fallback to selected role
      let actualRole = role;
      try {
        const payloadBase64 = token.split(".")[1];
        if (payloadBase64) {
          const payloadJson = JSON.parse(atob(payloadBase64));
          if (payloadJson.role) {
            actualRole = payloadJson.role;
          }
        }
      } catch (err) {
        console.error("Failed to decode token payload:", err);
      }

      localStorage.setItem("userRole", actualRole);

      const destination = actualRole === "THERAPIST" ? "/therapist-dashboard" : actualRole === "HOSPITAL" ? "/hospital-dashboard" : "/dashboard";
      navigate(destination);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Login failed!";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  const handleGoogleLoginResponse = async (response: any) => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(`${API_BASE}/api/auth/google`, {
        idToken: response.credential,
        role: role,
      });

      const token = res.data.token;
      localStorage.setItem("token", token);
      
      let actualEmail = email;
      let actualRole = role;
      try {
        const payloadBase64 = token.split(".")[1];
        if (payloadBase64) {
          const payloadJson = JSON.parse(atob(payloadBase64));
          if (payloadJson.sub) {
            actualEmail = payloadJson.sub;
          }
          if (payloadJson.role) {
            actualRole = payloadJson.role;
          }
        }
      } catch (err) {
        console.error("Failed to decode token payload:", err);
      }

      localStorage.setItem("userEmail", actualEmail);
      localStorage.setItem("userRole", actualRole);

      const destination = actualRole === "THERAPIST" ? "/therapist-dashboard" : actualRole === "HOSPITAL" ? "/hospital-dashboard" : "/dashboard";
      navigate(destination);
    } catch (err: any) {
      setError(err.response?.data?.message || "Google authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  // Render Google Login Button dynamically
  useEffect(() => {
    const initGoogle = () => {
      const google = (window as any).google;
      if (google && google.accounts) {
        google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "782957200-example.apps.googleusercontent.com",
          callback: handleGoogleLoginResponse,
        });
        google.accounts.id.renderButton(
          document.getElementById("google-signin-btn"),
          { theme: "outline", size: "large", width: "100%", text: "continue_with" }
        );
        return true;
      }
      return false;
    };

    if (!initGoogle()) {
      const interval = setInterval(() => {
        if (initGoogle()) {
          clearInterval(interval);
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, [role]);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Image & Quote (50%) */}
      <div
        className="hidden lg:flex lg:w-1/2 bg-gradient-hero items-center justify-center p-12"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url('${currentRole?.image}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          transition: "all 0.5s ease"
        }}
      >
        <div className="text-center max-w-md">
          <Heart className="w-16 h-16 text-primary-foreground mx-auto mb-6 animate-float" />
          <h2 className="font-heading text-3xl font-bold text-primary-foreground mb-4">{currentRole?.label}</h2>
          <p className="text-primary-foreground/80 text-lg">"{currentRole?.quote}"</p>
          <div className="pt-8">
            <p className="text-lg text-white/90 drop-shadow">{currentRole?.description}</p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form (50%) */}
      <div className="flex-1 flex items-center justify-center p-6 xl:p-10">
        <div className="w-full max-w-4xl">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>

          <h1 className="font-heading text-2xl font-bold mb-2">Log In</h1>
          <p className="text-muted-foreground text-sm mb-8">Enter your credentials to continue</p>

          <div className="space-y-4">
            {error && (
              <div className="rounded-2xl bg-red-500/20 border border-red-500/50 p-4 text-sm text-red-200 font-medium">
                {error}
              </div>
            )}

            {/* Role Selection */}
            <div className="space-y-3">
              <Label className="block text-sm font-semibold text-foreground">Select Role</Label>
              <div className="grid grid-cols-3 gap-3">
                {roles.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRole(value)}
                    className={`px-3 py-2 rounded-lg font-medium text-sm transition-all ${
                      role === value
                        ? "bg-primary text-primary-foreground shadow-lg"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} onKeyPress={handleKeyPress} />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} onKeyPress={handleKeyPress} />
            </div>

            <Button type="button" onClick={handleLogin} disabled={loading} variant="hero" className="w-full" size="lg">
              {loading ? "Signing in..." : "Log In"}
            </Button>

            <div className="relative my-4 flex py-2 items-center">
              <div className="flex-grow border-t border-slate-700/50"></div>
              <span className="flex-shrink mx-4 text-xs font-semibold text-muted-foreground uppercase">or continue with</span>
              <div className="flex-grow border-t border-slate-700/50"></div>
            </div>

            <div id="google-signin-btn" className="w-full flex justify-center"></div>
          </div>

          {/* Register Link */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary font-medium hover:underline">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
