import { ShoppingBag, User, Heart, Star, Search, Menu, X, Filter, ChevronDown, Sparkles, Truck, Shield, RefreshCw, LogOut, ArrowRight, Settings } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { useProducts } from '../context/ProductContext';

// Service base URLs
const PAYMENT_URL = import.meta.env.VITE_PAYMENT_URL || "http://localhost:4002";
const ORDER_URL = import.meta.env.VITE_ORDER_URL || "http://localhost:4001";

// Currency configuration
const CURRENCY = { code: 'inr', symbol: '₹' };

// Use products from backend via ProductContext
export default function Home() {
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const { products, loading: productsLoading } = useProducts();
  const categories = ['All', ...new Set((products || []).map(p => p.category))];
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const cartRef = useRef(null);
  const userMenuRef = useRef(null);

  // Check if user is logged in
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  
  // Login required modal state
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginModalMessage, setLoginModalMessage] = useState('');
  
  // Logout animation state
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    const checkLoginStatus = () => {
      const userStr = localStorage.getItem('user');
      const token = localStorage.getItem('authToken');
      if (userStr && token) {
        try {
          const user = JSON.parse(userStr);
          setIsLoggedIn(true);
          setUserName(user.name || user.email || 'User');
        } catch {
          setIsLoggedIn(false);
          setUserName('');
        }
      } else {
        setIsLoggedIn(false);
        setUserName('');
      }
    };
    checkLoginStatus();
    // Listen for storage changes (e.g., login from another tab)
    window.addEventListener('storage', checkLoginStatus);
    return () => window.removeEventListener('storage', checkLoginStatus);
  }, []);

  const handleLogout = () => {
    setIsLoggingOut(true);
    setIsUserMenuOpen(false);
    
    // Animate logout then clear data
    setTimeout(() => {
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
      setIsLoggedIn(false);
      setUserName('');
      setCart([]); // Clear cart on logout
      setIsLoggingOut(false);
    }, 1500);
  };

  // Close cart when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (cartRef.current && !cartRef.current.contains(event.target)) {
        const cartButton = document.querySelector('[aria-label="View cart"]');
        if (cartButton && !cartButton.contains(event.target)) {
          setIsCartOpen(false);
        }
      }
      // Close user menu when clicking outside
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        const userButton = document.querySelector('[aria-label="User menu"]');
        if (userButton && !userButton.contains(event.target)) {
          setIsUserMenuOpen(false);
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const [cart, setCart] = useState([]);
  const [gateways, setGateways] = useState([]);
  const [selectedGateway, setSelectedGateway] = useState('razorpay');
  const [userKey, setUserKey] = useState('guest');
  const [cartLoaded, setCartLoaded] = useState(false);
  const saveCartTimeoutRef = useRef(null);

  const getUserKey = () => {
    const raw = localStorage.getItem('user');
    if (!raw) return 'guest';
    try {
      const u = JSON.parse(raw);
      if (u?.email) return `user:${u.email}`;
      if (u?.id) return `user:${u.id}`;
    } catch {}
    return 'guest';
  };

  const getAuthToken = () => {
    return localStorage.getItem('authToken');
  };

  // Determine current user key
  useEffect(() => {
    setUserKey(getUserKey());
  }, []);

  // Fetch available payment gateways
  useEffect(() => {
    const loadGateways = async () => {
      try {
        const res = await fetch(`${PAYMENT_URL}/api/payment-gateways`);
        const data = await res.json();
        if (data.success && Array.isArray(data.gateways)) {
          setGateways(data.gateways.filter(g => g.available));
          const first = data.gateways.find(g => g.available);
          if (first) setSelectedGateway(first.id);
        }
      } catch (err) {
        setGateways([{ id: 'razorpay', name: 'Razorpay' }]);
        setSelectedGateway('razorpay');
      }
    };
    loadGateways();
  }, []);

  // Load cart from backend on mount
  useEffect(() => {
    const loadCart = async () => {
      if (!userKey || userKey === 'guest') {
        setCartLoaded(true);
        return;
      }

      const token = getAuthToken();
      if (!token) {
        try {
          const savedUserCart = localStorage.getItem(`cart:${userKey}`);
          if (savedUserCart) {
            const parsed = JSON.parse(savedUserCart);
            if (Array.isArray(parsed)) setCart(parsed);
          }
        } catch {}
        setCartLoaded(true);
        return;
      }

      try {
        const res = await fetch(`${ORDER_URL}/api/cart`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
        });
        const data = await res.json();
        if (data.success && data.cart?.items) {
          const items = data.cart.items.map(i => ({
            id: i.productId,
            name: i.name,
            image: i.image,
            price: i.price,
            quantity: i.quantity,
          }));
          setCart(items);
          localStorage.setItem(`cart:${userKey}`, JSON.stringify(items));
        }
      } catch (err) {
        console.warn('Failed to load cart from backend, using localStorage:', err.message);
        try {
          const savedUserCart = localStorage.getItem(`cart:${userKey}`);
          if (savedUserCart) {
            const parsed = JSON.parse(savedUserCart);
            if (Array.isArray(parsed)) setCart(parsed);
          }
        } catch {}
      } finally {
        setCartLoaded(true);
      }
    };
    
    if (userKey) loadCart();
  }, [userKey]);

  // Debounced save cart to backend
  useEffect(() => {
    if (!cartLoaded || !userKey || userKey === 'guest') return;

    const token = getAuthToken();
    if (!token) return;

    try {
      const serialized = JSON.stringify(cart);
      localStorage.setItem(`cart:${userKey}`, serialized);
    } catch {}

    if (saveCartTimeoutRef.current) {
      clearTimeout(saveCartTimeoutRef.current);
    }

    saveCartTimeoutRef.current = setTimeout(async () => {
      try {
        const items = cart.map(item => ({
          productId: String(item.id),
          name: item.name,
          image: item.image,
          price: item.price,
          quantity: item.quantity,
        }));

        await fetch(`${ORDER_URL}/api/cart`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
          body: JSON.stringify({ items }),
        });
      } catch (err) {
        console.warn('Failed to sync cart to backend:', err.message);
      }
    }, 500);

    return () => {
      if (saveCartTimeoutRef.current) {
        clearTimeout(saveCartTimeoutRef.current);
      }
    };
  }, [cart, cartLoaded, userKey]);

  const handleAddToCart = (product) => {
    // Check if user is logged in
    const token = localStorage.getItem('authToken');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) {
      setLoginModalMessage('Please sign in to add items to your cart');
      setShowLoginModal(true);
      return;
    }
    
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const handleRemoveFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const handlePlaceOrder = async (gateway) => {
    // Check if user is logged in before placing order
    const token = localStorage.getItem('authToken');
    const userStr = localStorage.getItem("user");
    if (!token || !userStr) {
      setProcessingPayment(false);
      setShowPaymentModal(false);
      setLoginModalMessage('Please sign in to complete your purchase');
      setShowLoginModal(true);
      return;
    }
    
    try {
      let userInfo = { email: '', userId: '' };
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          userInfo.email = user.email || '';
          userInfo.userId = user.id || user._id || '';
        } catch {}
      }

      const paymentGateway = gateway || selectedGateway;

      if (paymentGateway === 'stripe') {
        const res = await fetch(`${PAYMENT_URL}/api/stripe/create-checkout-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cart: cart.map(item => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity, image: item.image })),
            email: userInfo.email,
            userId: userInfo.userId,
            successUrl: window.location.origin + '/orders?status=success',
            cancelUrl: window.location.origin + '/',
            currency: CURRENCY.code
          })
        });
        const data = await res.json();
        if (data && data.success && data.url) {
          window.location.href = data.url;
          return;
        } else {
          setProcessingPayment(false);
          alert('Failed to start Stripe checkout');
          return;
        }
      }

      // Razorpay flow
      if (typeof window.Razorpay !== 'function') {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        await new Promise(resolve => {
          script.onload = resolve;
          script.onerror = () => { resolve(); };
        });
        if (typeof window.Razorpay !== 'function') {
          setProcessingPayment(false);
          alert('Razorpay SDK not loaded');
          return;
        }
      }

      const orderResponse = await fetch(`${PAYMENT_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: subtotal,
          receipt: 'order_' + Date.now(),
          notes: {
            items: JSON.stringify(cart.map(item => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity }))),
            email: userInfo.email || ''
          }
        })
      });

      const orderData = await orderResponse.json();
      const order = orderData.order;
      if (!order || !order.id) {
        setProcessingPayment(false);
        alert('Failed to create order');
        return;
      }

      // Close modal before opening Razorpay
      setShowPaymentModal(false);
      setProcessingPayment(false);

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: 'ShopNow',
        description: 'Order Payment',
        order_id: order.id,
        handler: async function(response) {
          try {
            const verificationResponse = await fetch(`${PAYMENT_URL}/api/verify-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                email: userInfo.email,
                userId: userInfo.userId,
                cart: cart.map(item => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity, image: item.image }))
              })
            });
            const result = await verificationResponse.json();

            if (result.success) {
              const token = getAuthToken();
              if (token) {
                try {
                  await fetch(`${ORDER_URL}/api/cart`, { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, credentials: 'include' });
                } catch {}
              }
              setCart([]);
              navigate('/orders?status=success');
            } else {
              alert('Payment verification failed');
            }
          } catch {
            alert('Payment verification error');
          }
        },
        modal: {
          ondismiss: function() {
            // User closed the Razorpay modal
          }
        },
        prefill: {
          email: userInfo.email,
        },
        theme: {
          color: '#6366f1'
        }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.on('payment.failed', function(response) { 
        alert(`Payment failed: ${response.error.description}`); 
      });
      paymentObject.open();
    } catch (e) {
      console.error(e);
      setProcessingPayment(false);
      alert('Order/payment error');
    }
  };

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [wishlist, setWishlist] = useState([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleWishlist = (productId) => {
    setWishlist(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50/30">
      {/* Logout Animation Overlay */}
      {isLoggingOut && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 animate-fade-in">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center">
              <svg className="w-10 h-10 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Signing Out...</h2>
            <p className="text-white/80">See you soon! 👋</p>
          </div>
        </div>
      )}

      {/* Login Required Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowLoginModal(false)}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-bounce-in">
            <button 
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                <User className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Sign In Required</h3>
              <p className="text-gray-500 mb-6">{loginModalMessage}</p>
              
              <div className="flex flex-col gap-3">
                <Link 
                  to="/login" 
                  onClick={() => setShowLoginModal(false)}
                  className="w-full py-3 px-6 rounded-xl bg-gradient-primary text-white font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  Sign In
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link 
                  to="/signup"
                  onClick={() => setShowLoginModal(false)}
                  className="w-full py-3 px-6 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-300"
                >
                  Create Account
                </Link>
              </div>
              
              <p className="mt-6 text-sm text-gray-400">
                Join thousands of happy shoppers! 🛍️
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payment Gateway Selection Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !processingPayment && setShowPaymentModal(false)}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-bounce-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">Checkout</h3>
                  <p className="text-white/80 text-sm mt-1">Choose your payment method</p>
                </div>
                {!processingPayment && (
                  <button 
                    onClick={() => setShowPaymentModal(false)}
                    className="p-2 rounded-full hover:bg-white/20 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Order Summary */}
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-600">Items ({totalItems})</span>
                <span className="font-medium text-gray-900">{CURRENCY.symbol}{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-600">Shipping</span>
                <span className="font-medium text-green-600">FREE</span>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <span className="text-lg font-bold text-gray-900">Total</span>
                <span className="text-2xl font-bold gradient-text">{CURRENCY.symbol}{subtotal.toFixed(2)}</span>
              </div>
            </div>
            
            {/* Payment Methods */}
            <div className="p-6">
              <p className="text-sm font-medium text-gray-700 mb-4">Select Payment Method</p>
              
              {processingPayment ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center animate-pulse">
                    <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">Processing Payment...</p>
                  <p className="text-sm text-gray-500 mt-1">Please wait, don't close this window</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Stripe Option */}
                  <button
                    onClick={() => {
                      setSelectedGateway('stripe');
                      setProcessingPayment(true);
                      handlePlaceOrder('stripe');
                    }}
                    className="w-full p-4 rounded-2xl border-2 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all duration-300 flex items-center gap-4 group"
                  >
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                      </svg>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">Pay with Stripe</p>
                      <p className="text-sm text-gray-500">Credit/Debit Card, Apple Pay, Google Pay</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                  </button>
                  
                  {/* Razorpay Option */}
                  <button
                    onClick={() => {
                      setSelectedGateway('razorpay');
                      setProcessingPayment(true);
                      handlePlaceOrder('razorpay');
                    }}
                    className="w-full p-4 rounded-2xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-300 flex items-center gap-4 group"
                  >
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.436 0H1.564C.7 0 0 .7 0 1.564v20.872C0 23.3.7 24 1.564 24h20.872c.864 0 1.564-.7 1.564-1.564V1.564C24 .7 23.3 0 22.436 0zM7.4 18.9l-2.8.9 3.6-11.1 2.8-.9-3.6 11.1zm4.4-1.3l-2.4.8L12 9.7l2.4-.8-2.6 8.7zm4.6-1.5l-2.4.8 2-6.6 2.4-.8-2 6.6z"/>
                      </svg>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">Pay with Razorpay</p>
                      <p className="text-sm text-gray-500">UPI, Cards, Net Banking, Wallets</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                  </button>
                </div>
              )}
              
              {/* Security Badge */}
              {!processingPayment && (
                <div className="mt-6 flex items-center justify-center gap-4 text-gray-400 text-xs">
                  <div className="flex items-center gap-1">
                    <Shield className="w-4 h-4" />
                    <span>SSL Secured</span>
                  </div>
                  <div className="w-px h-4 bg-gray-200"></div>
                  <div className="flex items-center gap-1">
                    <span>🔐</span>
                    <span>256-bit Encryption</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-xl shadow-sm sticky top-0 z-40 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex-shrink-0 flex items-center group">
                <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:shadow-indigo-500/50 transition-all duration-300">
                  <ShoppingBag className="h-5 w-5 text-white" />
                </div>
                <span className="ml-3 text-xl font-bold gradient-text">ShopNow</span>
              </Link>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex md:items-center md:space-x-1">
              {[
                { to: '/', label: 'Home', active: true },
                { to: '/shop', label: 'Shop' },
                { to: '/about', label: 'About' },
                { to: '/contact', label: 'Contact' },
                { to: '/orders', label: 'Orders' },
              ].map(({ to, label, active }) => (
                <Link 
                  key={to}
                  to={to} 
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                    active 
                      ? 'bg-gradient-primary text-white shadow-lg shadow-indigo-500/30' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
            
            <div className="flex items-center gap-3">
              {/* Wishlist */}
              <button className="relative p-2 rounded-xl text-gray-500 hover:text-red-500 hover:bg-red-50 transition-all duration-300">
                <Heart className={`h-5 w-5 ${wishlist.length > 0 ? 'fill-red-500 text-red-500' : ''}`} />
                {wishlist.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-bounce-in">
                    {wishlist.length}
                  </span>
                )}
              </button>

              {/* Cart Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsCartOpen(!isCartOpen)}
                  aria-label="View cart"
                  className="relative p-2 rounded-xl text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-300"
                >
                  <ShoppingBag className="h-5 w-5" />
                  {totalItems > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-primary text-white text-xs rounded-full flex items-center justify-center animate-bounce-in shadow-lg">
                      {totalItems}
                    </span>
                  )}
                </button>

                {/* Cart Dropdown */}
                {isCartOpen && (
                  <div ref={cartRef} className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl overflow-hidden z-50 border border-gray-100 animate-slide-up">
                    <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-indigo-500 to-purple-600">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white">Shopping Cart</h3>
                        <span className="px-3 py-1 bg-white/20 rounded-full text-white text-sm">{totalItems} items</span>
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto p-4">
                      {cart.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                            <ShoppingBag className="w-8 h-8 text-gray-400" />
                          </div>
                          <p className="text-gray-500">Your cart is empty</p>
                          <p className="text-sm text-gray-400 mt-1">Add items to get started</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {cart.map((item, idx) => (
                            <div key={`${item.id}-${idx}`} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                              <div className="w-16 h-16 rounded-xl overflow-hidden bg-white shadow-sm flex-shrink-0">
                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-gray-900 truncate">{item.name}</h4>
                                <p className="text-sm text-gray-500">{CURRENCY.symbol}{item.price.toFixed(2)} × {item.quantity}</p>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRemoveFromCart(item.id); }}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {cart.length > 0 && (
                      <div className="border-t border-gray-100 p-4 bg-gray-50/50">
                        <div className="flex justify-between text-lg font-semibold text-gray-900 mb-4">
                          <span>Subtotal</span>
                          <span className="gradient-text">{CURRENCY.symbol}{subtotal.toFixed(2)}</span>
                        </div>
                        <button
                          onClick={() => {
                            // Check if user is logged in before showing payment modal
                            const token = localStorage.getItem('authToken');
                            const userStr = localStorage.getItem('user');
                            if (!token || !userStr) {
                              setLoginModalMessage('Please sign in to complete your purchase');
                              setShowLoginModal(true);
                              setIsCartOpen(false);
                              return;
                            }
                            setIsCartOpen(false);
                            setShowPaymentModal(true);
                          }}
                          className="w-full py-3 px-4 rounded-xl bg-gradient-primary text-white font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all duration-300 btn-glow flex items-center justify-center gap-2"
                        >
                          <Sparkles className="w-5 h-5" />
                          Proceed to Checkout
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* User Button / Auth Section */}
              <div className="relative">
                {isLoggedIn ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      aria-label="User menu"
                      className="flex items-center gap-2 p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-300"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold text-sm">
                        {userName.charAt(0).toUpperCase()}
                      </div>
                      <span className="hidden sm:block text-sm font-medium max-w-[100px] truncate">{userName}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* User Menu Dropdown */}
                    {isUserMenuOpen && (
                      <div ref={userMenuRef} className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl overflow-hidden z-50 border border-gray-100 animate-slide-up">
                        <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-600">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                              {userName.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white truncate">{userName}</p>
                              <p className="text-xs text-white/70">Welcome back!</p>
                            </div>
                          </div>
                        </div>
                        <div className="p-2">
                          <Link 
                            to="/orders" 
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-300"
                          >
                            <ShoppingBag className="w-5 h-5 text-gray-400" />
                            My Orders
                          </Link>
                          {isAdmin && (
                            <Link 
                              to="/admin/dashboard" 
                              onClick={() => setIsUserMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-purple-600 hover:bg-purple-50 transition-all duration-300"
                            >
                              <Settings className="w-5 h-5" />
                              Admin Dashboard
                            </Link>
                          )}
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-300"
                          >
                            <LogOut className="w-5 h-5" />
                            Sign Out
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <Link 
                      to="/login" 
                      className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-300"
                    >
                      Sign In
                    </Link>
                    <Link 
                      to="/signup" 
                      className="px-4 py-2 rounded-xl text-sm font-medium bg-gradient-primary text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all duration-300"
                    >
                      Sign Up
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-dark">
          {/* Animated Background */}
          <div className="absolute inset-0">
            <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/30 rounded-full blur-3xl animate-blob"></div>
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-500/30 rounded-full blur-3xl animate-blob" style={{ animationDelay: '2s' }}></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl animate-blob" style={{ animationDelay: '4s' }}></div>
          </div>
          
          {/* Grid Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="h-full w-full" style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '50px 50px'
            }}></div>
          </div>

          <div className={`relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white/90 text-sm mb-8 animate-slide-up">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span>New Summer Collection 2024</span>
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                Discover Your
                <span className="block mt-2 gradient-text-warm">Perfect Style</span>
              </h1>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
                Explore our curated collection of 30+ premium products. From trendy shoes to stylish accessories, find everything you need.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/shop"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white text-gray-900 font-semibold text-lg shadow-2xl hover:-translate-y-1 hover:shadow-white/25 transition-all duration-300"
                >
                  <ShoppingBag className="w-5 h-5" />
                  Shop Now
                </Link>
                <button className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 text-white font-semibold text-lg hover:bg-white/20 transition-all duration-300">
                  <Sparkles className="w-5 h-5" />
                  View Lookbook
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-20 grid grid-cols-3 gap-8 max-w-3xl mx-auto">
              {[
                { value: '30+', label: 'Products' },
                { value: '10K+', label: 'Happy Customers' },
                { value: '4.9', label: 'Average Rating' },
              ].map((stat, idx) => (
                <div key={idx} className="text-center">
                  <p className="text-4xl font-bold text-white mb-2">{stat.value}</p>
                  <p className="text-gray-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Floating Elements */}
          <div className="hidden lg:block absolute bottom-10 left-10 p-4 rounded-2xl glass animate-float">
            <div className="flex items-center gap-3">
              <Truck className="w-8 h-8 text-white" />
              <div>
                <p className="text-white font-semibold">Free Shipping</p>
                <p className="text-gray-400 text-sm">On orders ₹4000+</p>
              </div>
            </div>
          </div>

          <div className="hidden lg:block absolute top-20 right-10 p-4 rounded-2xl glass animate-float" style={{ animationDelay: '1s' }}>
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-white" />
              <div>
                <p className="text-white font-semibold">Secure Payment</p>
                <p className="text-gray-400 text-sm">100% Protected</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/20 transition-all duration-300"
                />
              </div>
              
              {/* Category Filters */}
              <div className="flex gap-2 flex-wrap">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-5 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                      selectedCategory === category
                        ? 'bg-gradient-primary text-white shadow-lg shadow-indigo-500/30'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Products Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                {selectedCategory === 'All' ? 'All Products' : selectedCategory}
              </h2>
              <p className="text-gray-500 mt-2">{filteredProducts.length} products found</p>
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product, index) => (
              <div 
                key={product.id} 
                className={`group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-2 transition-all duration-500 animate-slide-up`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Image Container */}
                <div className="relative aspect-square overflow-hidden bg-gray-100">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  
                  {/* Badge */}
                  {product.badge && (
                    <span className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold shadow-lg ${
                      product.badge === 'New' ? 'bg-green-500 text-white' :
                      product.badge === 'Sale' ? 'bg-red-500 text-white' :
                      product.badge === 'Hot' ? 'bg-orange-500 text-white' :
                      product.badge === 'Bestseller' ? 'bg-indigo-500 text-white' :
                      product.badge === 'Premium' ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white' :
                      product.badge === 'Trending' ? 'bg-pink-500 text-white' :
                      product.badge === 'Luxury' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white' :
                      'bg-gray-900 text-white'
                    }`}>
                      {product.badge}
                    </span>
                  )}

                  {/* Wishlist Button */}
                  <button 
                    onClick={() => toggleWishlist(product.id)}
                    className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center hover:bg-white hover:scale-110 transition-all duration-300"
                  >
                    <Heart className={`w-5 h-5 transition-colors ${wishlist.includes(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                  </button>

                  {/* Quick Add Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <button 
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAddToCart(product); }}
                      className="px-6 py-3 bg-white rounded-xl font-semibold text-gray-900 shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <ShoppingBag className="w-5 h-5" />
                      Add to Cart
                    </button>
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">{product.category}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                    {product.name}
                  </h3>
                  
                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-4 h-4 ${i < Math.floor(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-500">({product.reviews})</span>
                  </div>

                  {/* Color Options */}
                  {product.colors && (
                    <div className="flex items-center gap-1.5 mb-3">
                      {product.colors.slice(0, 4).map((color, i) => (
                        <div 
                          key={i} 
                          className="w-5 h-5 rounded-full border-2 border-white shadow-sm cursor-pointer hover:scale-110 transition-transform"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                      {product.colors.length > 4 && (
                        <span className="text-xs text-gray-400">+{product.colors.length - 4}</span>
                      )}
                    </div>
                  )}

                  {/* Price */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold gradient-text">{CURRENCY.symbol}{product.price}</span>
                      {product.originalPrice && (
                        <span className="text-sm text-gray-400 line-through">{CURRENCY.symbol}{product.originalPrice}</span>
                      )}
                    </div>
                    {product.originalPrice && (
                      <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                        Save {CURRENCY.symbol}{product.originalPrice - product.price}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-gray-900 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                { icon: Truck, title: 'Free Shipping', desc: 'On orders over ₹4000' },
                { icon: Shield, title: 'Secure Payment', desc: '100% protected' },
                { icon: RefreshCw, title: 'Easy Returns', desc: '30-day guarantee' },
                { icon: Sparkles, title: 'Premium Quality', desc: 'Curated products' },
              ].map(({ icon: Icon, title, desc }, idx) => (
                <div key={idx} className="text-center p-6 rounded-2xl bg-white/5 backdrop-blur hover:bg-white/10 transition-colors">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-lg">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
                  <p className="text-gray-400">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Newsletter Section */}
        <div className="relative overflow-hidden py-24 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-0 w-96 h-96 bg-white/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-white/20 rounded-full blur-3xl"></div>
          </div>
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold text-white mb-4">Stay in the Loop</h2>
            <p className="text-xl text-white/80 mb-8">Subscribe for exclusive deals, new arrivals, and 10% off your first order!</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-xl mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-6 py-4 rounded-xl bg-white/20 backdrop-blur-xl border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-4 focus:ring-white/30"
              />
              <button className="px-8 py-4 rounded-xl bg-white text-indigo-600 font-semibold shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">ShopNow</span>
              </div>
              <p className="text-gray-400 mb-6">Your one-stop destination for premium products. Quality guaranteed.</p>
              <div className="flex gap-4">
                {['facebook', 'twitter', 'instagram', 'youtube'].map((social) => (
                  <a key={social} href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:bg-white/20 hover:text-white transition-colors">
                    <span className="sr-only">{social}</span>
                    <div className="w-5 h-5"></div>
                  </a>
                ))}
              </div>
            </div>
            {[
              { title: 'Shop', links: ['All Products', 'New Arrivals', 'Best Sellers', 'Sale'] },
              { title: 'Company', links: ['About Us', 'Careers', 'Press', 'Blog'] },
              { title: 'Support', links: ['Help Center', 'Shipping', 'Returns', 'Contact'] },
            ].map(({ title, links }) => (
              <div key={title}>
                <h4 className="text-white font-semibold mb-6">{title}</h4>
                <ul className="space-y-4">
                  {links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-gray-400 hover:text-white transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">© 2024 ShopNow. All rights reserved.</p>
            <div className="flex gap-6">
              {['Privacy', 'Terms', 'Cookies'].map((item) => (
                <a key={item} href="#" className="text-gray-400 hover:text-white text-sm transition-colors">{item}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
