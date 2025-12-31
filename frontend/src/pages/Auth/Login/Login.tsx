import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Text } from "../../../components/Text/Text";
import logo from "../../../assets/logo.png";
import { GoogleIcon } from "../../../components/Icons/GoogleIcon/GoogleIcon";
import { MicrosoftIcon } from "../../../components/Icons/MicrosoftIcon/MicrosoftIcon";

interface LoginProps {
  onLogin: () => void;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");
    setPasswordError("");

    let isValid = true;

    if (!email) {
      setEmailError("Email is required");
      isValid = false;
    } else if (!emailRegex.test(email)) {
      setEmailError("Invalid email format");
      isValid = false;
    }

    if (!password) {
      setPasswordError("Password is required");
      isValid = false;
    }

    if (isValid) {
      onLogin();
    }
  };

  return (
    <div className="flex min-h-screen min-w-screen bg-gray-50">
      {/* Left side (desktop only) */}
      <div className="hidden items-center justify-center bg-linear-to-br from-blue-600 to-blue-800 p-12 lg:flex lg:w-1/2">
        <div className="max-w-md">
          <div className="mb-6 flex items-center gap-3">
            <img src={logo} alt="SKY CONTROL" className="h-12 w-12" />
            <span className="text-2xl text-white">SKY CONTROL</span>
          </div>
          <h1 className="mb-4 text-4xl text-white">
            Unified control for your multi-cloud environment
          </h1>
          <Text className="text-lg text-blue-100">
            Deploy and manage your applications across AWS, Azure, and GCP
            without cloud expertise.
          </Text>
        </div>
      </div>

      {/* Right side – login card */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <img src={logo} alt="SKY CONTROL" className="h-10 w-10" />
            <span className="text-xl text-gray-900">SKY CONTROL</span>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
            <div className="mb-8 text-center">
              <h2 className="mb-2 text-2xl text-gray-900">
                Log In to Your Account
              </h2>
              <Text className="text-sm text-gray-600">
                Access your cloud applications and dashboard
              </Text>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm text-gray-700"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError("");
                  }}
                  placeholder="you@example.com"
                  className={`w-full rounded-lg border px-4 py-3 text-sm outline-none ring-blue-500 transition-colors ${
                    emailError
                      ? "border-red-300 ring-red-500 focus:ring-2"
                      : "border-gray-300 focus:ring-2"
                  }`}
                />
                {emailError && (
                  <Text className="mt-1 text-sm text-red-600">
                    {emailError}
                  </Text>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="password" className="text-sm text-gray-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => navigate("/forgotpassword")}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError("");
                    }}
                    placeholder="Enter your password"
                    className={`w-full rounded-lg border px-4 py-3 pr-12 text-sm outline-none ring-blue-500 transition-colors ${
                      passwordError
                        ? "border-red-300 ring-red-500 focus:ring-2"
                        : "border-gray-300 focus:ring-2"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transform text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {passwordError && (
                  <Text className="mt-1 text-sm text-red-600">
                    {passwordError}
                  </Text>
                )}
              </div>

              {/* Login button */}
              <button
                type="submit"
                className="w-full rounded-lg bg-blue-600 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                Log In
              </button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-4">
              <div className="flex-1 border-t border-gray-200" />
              <span className="text-xs text-gray-500">OR</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>

            {/* Social buttons (static for now) */}
            <div className="space-y-3">
              <button
                disabled
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-700 transition-colors hover:bg-gray-50"
              >
                <GoogleIcon className="h-5 w-5" />
                Continue with Google
              </button>
              <button
                disabled={true}
                className="flex w-full items-center justify-center  gap-3 rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-700 transition-colors hover:bg-gray-50"
              >
                <MicrosoftIcon className="h-5 w-5" />
                Continue with Microsoft 365
              </button>
            </div>

            {/* Signup link */}
            <div className="mt-6 text-center text-sm text-gray-600">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/signup")}
                className="text-blue-600 hover:underline"
              >
                Sign up
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
