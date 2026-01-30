import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Package, Truck, CheckCircle, Clock, ChevronDown, ChevronUp, RefreshCw, Calendar, AlertCircle, Home, Store, X, Sparkles, LogOut } from 'lucide-react';

const ORDER_SERVICE_URL = import.meta.env.VITE_ORDER_URL || 'http://localhost:4001';
const PAYMENT_SERVICE_URL = import.meta.env.VITE_PAYMENT_URL || 'http://localhost:4002';

const statusConfig = {
  pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-800 border-yellow-200', iconColor: 'text-yellow-500', label: 'Pending' },
  processing: { icon: RefreshCw, color: 'bg-blue-100 text-blue-800 border-blue-200', iconColor: 'text-blue-500', label: 'Processing' },
  shipped: { icon: Truck, color: 'bg-purple-100 text-purple-800 border-purple-200', iconColor: 'text-purple-500', label: 'Shipped' },
  delivered: { icon: CheckCircle, color: 'bg-green-100 text-green-800 border-green-200', iconColor: 'text-green-500', label: 'Delivered' },
  paid: { icon: CheckCircle, color: 'bg-green-100 text-green-800 border-green-200', iconColor: 'text-green-500', label: 'Paid' },
  cancelled: { icon: X, color: 'bg-red-100 text-red-800 border-red-200', iconColor: 'text-red-500', label: 'Cancelled' },
};

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stripeConfirmed, setStripeConfirmed] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [searchParams] = useSearchParams();

  const getUserKey = () => {
    const raw = localStorage.getItem('user');
    if (!raw) return 'guest';
    try {
      const u = JSON.parse(raw);
      if (u?.email) return 'user:' + u.email;
      if (u?.id) return 'user:' + u.id;
    } catch {}
    return 'guest';
  };

  const getAuthToken = () => localStorage.getItem('authToken');

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
    window.addEventListener('storage', checkLoginStatus);
    return () => window.removeEventListener('storage', checkLoginStatus);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    setIsLoggedIn(false);
    setUserName('');
    setIsUserMenuOpen(false);
    navigate('/');
  };

  useEffect(() => {
    const status = searchParams.get('status');
    if (status === 'success') {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    }
  }, [searchParams]);

  useEffect(() => {
    const confirmStripeCheckout = async () => {
      const sessionId = searchParams.get('session_id');
      if (sessionId && !stripeConfirmed) {
        try {
          const res = await fetch(PAYMENT_SERVICE_URL + '/api/stripe/confirm-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          });
          const data = await res.json();
          if (data.success) {
            setStripeConfirmed(true);
            localStorage.removeItem('cart:' + getUserKey());
            const token = getAuthToken();
            if (token) {
              try {
                await fetch(ORDER_SERVICE_URL + '/api/cart', {
                  method: 'DELETE',
                  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
                  credentials: 'include',
                });
              } catch (e) {}
            }
            setTimeout(() => { window.location.href = '/orders?status=success'; }, 2000);
          }
        } catch (e) {}
      }
    };
    confirmStripeCheckout();
  }, [searchParams, stripeConfirmed]);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError('');
      const token = getAuthToken();
      const key = getUserKey();
      try {
        if (!token) throw new Error('Not authenticated');
        const res = await fetch(ORDER_SERVICE_URL + '/api/orders', {
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          credentials: 'include',
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to load orders');
        const list = Array.isArray(data.orders) ? data.orders : [];
        setOrders(list);
        localStorage.setItem('orders:' + key, JSON.stringify(list));
      } catch (e) {
        try {
          const saved = JSON.parse(localStorage.getItem('orders:' + key) || '[]');
          setOrders(Array.isArray(saved) ? saved : []);
          setError('Unable to fetch latest orders. Showing cached data.');
        } catch {
          setOrders([]);
          setError('No orders found');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const currency = (n) => '$' + Number(n || 0).toFixed(2);
  const formatDate = (iso) => {
    const date = new Date(iso);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  const toggleOrder = (orderId) => setExpandedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  const getStatusConfig = (status) => statusConfig[(status || 'paid').toLowerCase()] || statusConfig.paid;

  const OrderSkeleton = () => (
    <div className="bg-white rounded-2xl p-6 shadow-sm animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 bg-gray-200 rounded w-32"></div>
        <div className="h-6 bg-gray-200 rounded w-20"></div>
      </div>
      <div className="flex gap-4">
        <div className="h-4 bg-gray-200 rounded w-24"></div>
        <div className="h-4 bg-gray-200 rounded w-20"></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50/30">
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
          <div className="bg-green-500 text-white px-6 py-4 rounded-2xl shadow-lg flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold">Payment Successful!</p>
              <p className="text-sm text-green-100">Your order has been confirmed</p>
            </div>
            <button onClick={() => setShowSuccess(false)} className="ml-4 hover:bg-white/20 p-1 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <nav className="bg-white/80 backdrop-blur-xl shadow-sm sticky top-0 z-40 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex-shrink-0 flex items-center group">
                <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:shadow-indigo-500/50 transition-shadow">
                  <ShoppingBag className="h-5 w-5 text-white" />
                </div>
                <span className="ml-3 text-xl font-bold gradient-text">ShopNow</span>
              </Link>
            </div>
            <div className="hidden md:flex md:items-center md:space-x-1">
              {[
                { to: '/', icon: Home, label: 'Home' },
                { to: '/shop', icon: Store, label: 'Shop' },
                { to: '/orders', icon: Package, label: 'Orders', active: true },
              ].map(({ to, icon: Icon, label, active }) => (
                <Link key={to} to={to} className={"flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 " + (active ? 'bg-gradient-primary text-white shadow-lg shadow-indigo-500/30' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100')}>
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              ))}
            </div>
            <div className="flex items-center">
              {isLoggedIn ? (
                <div className="relative">
                  <button type="button" onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} aria-label="User menu" className="flex items-center gap-2 p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-300">
                    <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold text-sm">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden sm:block text-sm font-medium max-w-[100px] truncate">{userName}</span>
                    <ChevronDown className={"w-4 h-4 transition-transform duration-300 " + (isUserMenuOpen ? 'rotate-180' : '')} />
                  </button>
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
                        <Link to="/" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-300">
                          <Home className="w-5 h-5 text-gray-400" />
                          Home
                        </Link>
                        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-300">
                          <LogOut className="w-5 h-5" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login" className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-300">Sign In</Link>
                  <Link to="/signup" className="px-4 py-2 rounded-xl text-sm font-medium bg-gradient-primary text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all duration-300">Sign Up</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Package className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Order History</h1>
              <p className="text-gray-500 mt-1">Track and manage your recent purchases</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-yellow-50 border border-yellow-200 flex items-center gap-3 animate-slide-up">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
            <p className="text-sm text-yellow-700">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {loading ? (
            <><OrderSkeleton /><OrderSkeleton /><OrderSkeleton /></>
          ) : orders.length === 0 ? (
            <div className="text-center py-20 animate-fade-in">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
                <Package className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No orders yet</h3>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">Looks like you haven't made any purchases yet. Start shopping to see your orders here!</p>
              <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-primary text-white font-medium shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
                <Sparkles className="w-5 h-5" />
                Start Shopping
              </Link>
            </div>
          ) : (
            orders.map((order, index) => {
              const status = getStatusConfig(order.status);
              const StatusIcon = status.icon;
              const isExpanded = expandedOrders[order._id || order.id];
              const items = order.items || [];
              return (
                <div key={order._id || order.id || index} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300 animate-slide-up" style={{ animationDelay: index * 100 + 'ms' }}>
                  <div className="p-6 cursor-pointer" onClick={() => toggleOrder(order._id || order.id)}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                          <Package className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">Order #{(order._id || order.id || '').slice(-8).toUpperCase()}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(order.createdAt || order.date)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className={"px-3 py-1.5 rounded-full text-sm font-medium border flex items-center gap-2 " + status.color}>
                          <StatusIcon className={"w-4 h-4 " + status.iconColor} />
                          {status.label}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">{currency(order.amount || order.total)}</p>
                          <p className="text-sm text-gray-500">{items.length} item{items.length !== 1 ? 's' : ''}</p>
                        </div>
                        <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                          {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-gray-100 animate-slide-up">
                      <div className="p-6">
                        <h4 className="text-sm font-semibold text-gray-700 mb-4">Order Items</h4>
                        <div className="space-y-4">
                          {items.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-4 p-4 rounded-xl bg-gray-50">
                              {item.image && (
                                <div className="w-16 h-16 rounded-xl overflow-hidden bg-white shadow-sm flex-shrink-0">
                                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{item.name}</p>
                                <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                              </div>
                              <p className="font-semibold text-gray-900">{currency(item.price * item.quantity)}</p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-6 pt-6 border-t border-gray-100">
                          <div className="flex justify-between text-sm text-gray-500 mb-2">
                            <span>Subtotal</span>
                            <span>{currency(order.amount || order.total)}</span>
                          </div>
                          <div className="flex justify-between text-sm text-gray-500 mb-2">
                            <span>Shipping</span>
                            <span className="text-green-600">Free</span>
                          </div>
                          <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-100 mt-2">
                            <span>Total</span>
                            <span className="gradient-text">{currency(order.amount || order.total)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
