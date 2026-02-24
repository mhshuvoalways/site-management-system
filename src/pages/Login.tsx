import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import logoImg from "@/assets/logo.webp";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { signIn, profile, user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log("Login state:", {
      user: !!user,
      profile: !!profile,
      loading,
      submitting,
    });

    if (user && profile && !loading) {
      console.log("Redirecting to:", profile.role);
      const redirectMap: Record<string, string> = {
        admin: "/admin",
        site_manager: "/site-manager",
        worker: "/worker",
      };
      navigate(redirectMap[profile.role] || "/login");
    } else if (user && !profile && !loading && submitting) {
      console.warn("Profile not found for authenticated user");
      const timer = setTimeout(() => {
        setError("User profile not found. Please contact your administrator.");
        setSubmitting(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user, profile, loading, navigate, submitting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await signIn(email, password);
    } catch {
      setError("Invalid email or password");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0db2ad] to-[#567fca] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <img src={logoImg} alt="Logo" className="h-20 mb-2" />
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none transition"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent outline-none transition"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-[#0db2ad] to-[#567fca] text-white py-3 rounded-lg font-medium hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
