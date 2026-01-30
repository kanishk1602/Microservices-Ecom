import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Eye, EyeOff, Mail, Lock, ArrowRight, Sparkles, Github, Chrome } from 'lucide-react';

const AUTH_URL = import.meta.env.VITE_AUTH_URL || 'http://localhost:4000';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setError('');
    setLoading(true); 

    try {
      const res = await fetch(`${AUTH_URL}/api/v1/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await res.json();
      
      if ((data.success === true || data.success === "true") && data.token) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        // Show success animation before redirect
        setLoginSuccess(true);
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Success overlay component
  if (loginSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
        <div className="text-center animate-bounce-in">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center animate-pulse">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Welcome Back!</h2>
          <p className="text-white/80">Redirecting to your dashboard...</p>
          <div className="mt-6 flex justify-center gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-3 h-3 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-dark">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/30 rounded-full blur-3xl animate-blob"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-500/30 rounded-full blur-3xl animate-blob" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl animate-blob" style={{ animationDelay: '4s' }}></div>
        </div>

        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="h-full w-full" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}></div>
        </div>

        {/* Content */}
        <div className={`relative z-10 flex flex-col justify-center items-center w-full p-12 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="text-center max-w-md">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-xl mb-8 animate-float">
              <ShoppingBag className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">
              Welcome to <span className="gradient-text-warm">ShopNow</span>
            </h1>
            <p className="text-gray-300 text-lg leading-relaxed mb-8">
              Discover thousands of premium products from top brands. Your next favorite item is just a click away.
            </p>
            
            {/* Features */}
            <div className="space-y-4 text-left">
              {[
                { icon: '🚀', text: 'Fast & Free Shipping' },
                { icon: '🔒', text: 'Secure Payments' },
                { icon: '💎', text: 'Premium Quality Products' },
              ].map((feature, idx) => (
                <div 
                  key={idx} 
                  className={`flex items-center gap-3 p-3 rounded-xl bg-white/5 backdrop-blur transition-all duration-500 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}
                  style={{ transitionDelay: `${(idx + 1) * 200}ms` }}
                >
                  <span className="text-2xl">{feature.icon}</span>
                  <span className="text-white font-medium">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Floating Cards */}
          <div className="absolute bottom-10 left-10 p-4 rounded-2xl glass animate-float" style={{ animationDelay: '1s' }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-secondary flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold">New Arrivals</p>
                <p className="text-gray-400 text-sm">50+ items this week</p>
              </div>
            </div>
          </div>

          <div className="absolute top-10 right-10 p-4 rounded-2xl glass animate-float" style={{ animationDelay: '2s' }}>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {['😊', '🤩', '😍'].map((emoji, i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm border-2 border-gray-900">
                    {emoji}
                  </div>
                ))}
              </div>
              <p className="text-white text-sm ml-2">2M+ Happy Customers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className={`w-full max-w-md transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold gradient-text">ShopNow</span>
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Welcome back!</h2>
            <p className="text-gray-500 mt-2">Sign in to continue shopping</p>
          </div>

          {/* Social Login Buttons */}
          <div className="flex gap-4 mb-6">
            <button className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
              <Chrome className="w-5 h-5 text-red-500" />
              <span className="text-gray-700 font-medium">Google</span>
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
              <Github className="w-5 h-5 text-gray-900" />
              <span className="text-gray-700 font-medium">GitHub</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-gray-50 text-gray-500">or continue with email</span>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-3 animate-slide-up">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-red-500">⚠️</span>
                </div>
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all duration-300"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <Link to="/forgot-password" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3.5 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all duration-300"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="remember"
                type="checkbox"
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="remember" className="ml-2 text-sm text-gray-600">
                Keep me signed in
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 rounded-xl bg-gradient-primary text-white font-semibold text-lg shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg flex items-center justify-center gap-2 btn-glow"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-gray-600">
            Don't have an account?{' '}
            <Link to="/signup" className="text-indigo-600 hover:text-indigo-700 font-semibold link-underline">
              Create one free
            </Link>
          </p>

          {/* Trust Badges */}
          <div className="mt-8 flex items-center justify-center gap-6 text-gray-400">
            <div className="flex items-center gap-1 text-xs">
              <Lock className="w-4 h-4" />
              <span>SSL Secured</span>
            </div>
            <div className="w-px h-4 bg-gray-300"></div>
            <div className="flex items-center gap-1 text-xs">
              <span>🔐</span>
              <span>256-bit Encryption</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
