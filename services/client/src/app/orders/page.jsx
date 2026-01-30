'use client';

import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  const [stripeConfirmed, setStripeConfirmed] = useState(false);
  
  const searchParams = useSearchParams();

  const ORDER_SERVICE_URL = process.env.NEXT_PUBLIC_ORDER_URL || 'http://localhost:4001';
  const PAYMENT_SERVICE_URL = process.env.NEXT_PUBLIC_PAYMENT_URL || 'http://localhost:4002';

  const getUserKey = () => {
    if (typeof window === 'undefined') return 'guest';
    const raw = window.localStorage.getItem('user');
    if (!raw) return 'guest';
    try {
      const u = JSON.parse(raw);
      if (u?.email) return `user:${u.email}`;
      if (u?.id) return `user:${u.id}`;
    } catch {}
    return 'guest';
  };

  const getAuthToken = () => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem('authToken');
  };

  // Handle Stripe redirect - confirm the checkout session
  useEffect(() => {
    const confirmStripeCheckout = async () => {
      const sessionId = searchParams.get('session_id');
      
      console.warn('[Orders] URL params:', {
        session_id: sessionId,
        status: searchParams.get('status'),
        all: searchParams.toString()
      });
      
      if (sessionId && !stripeConfirmed) {
        console.warn('[Orders] Calling confirm-checkout with sessionId:', sessionId);
        try {
          const res = await fetch(`${PAYMENT_SERVICE_URL}/api/stripe/confirm-checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          });
          const data = await res.json();
          
          if (data.success) {
            setStripeConfirmed(true);
            // Clear cart from localStorage
            const userKey = getUserKey();
            if (typeof window !== 'undefined') {
              window.localStorage.removeItem(`cart:${userKey}`);
            }
            // Also clear cart from backend
            const token = getAuthToken();
            if (token) {
              try {
                await fetch(`${ORDER_SERVICE_URL}/api/cart`, {
                  method: 'DELETE',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  credentials: 'include',
                });
              } catch (e) {
                console.warn('Failed to clear cart from backend:', e);
              }
            }
            // Wait a moment for Kafka to process, then refresh orders
            setTimeout(() => {
              window.location.href = '/orders'; // Remove query params and refresh
            }, 2000);
          }
        } catch (e) {
          console.error('Failed to confirm Stripe checkout:', e);
        }
      }
    };
    
    confirmStripeCheckout();
  }, [searchParams, stripeConfirmed, PAYMENT_SERVICE_URL, ORDER_SERVICE_URL]);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError('');
      setDebugInfo('');
      const token = getAuthToken();
      const key = getUserKey();
      try {
        if (!token) throw new Error('Not authenticated');
        const res = await fetch(`${ORDER_SERVICE_URL}/api/orders`, {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          credentials: 'include',
        });
        const data = await res.json();
        //setDebugInfo(`Status: ${res.status}, Success: ${data.success}, Count: ${data.orders?.length || 0}`);
        if (!data.success) throw new Error(data.error || 'Failed to load orders');
        const list = Array.isArray(data.orders) ? data.orders : [];
        setOrders(list);
        // cache locally for offline fallback
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(`orders:${key}`, JSON.stringify(list));
        }
      } catch (e) {
        // fallback to local cache
        try {
          const saved = JSON.parse(
            (typeof window !== 'undefined' && window.localStorage.getItem(`orders:${key}`)) || '[]'
          );
          setOrders(Array.isArray(saved) ? saved : []);
          setError(`API failed: ${e.message}. Showing cached orders.`);
        } catch {
          setOrders([]);
          setError('No orders found');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [ORDER_SERVICE_URL]);

  const currency = (n) => `$${Number(n || 0).toFixed(2)}`;
  const formatDate = (iso) => new Date(iso).toLocaleString();

  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-extrabold text-gray-900">Order History</h1>
        <p className="mt-2 text-sm text-gray-500">
          Check the status of recent orders, manage returns, and download invoices.
        </p>
        {debugInfo && (
          <p className="mt-2 text-xs text-blue-600">{debugInfo}</p>
        )}
        {error && (
          <p className="mt-2 text-xs text-yellow-600">{error}</p>
        )}

        <div className="mt-12">
          <h2 className="sr-only">Recent orders</h2>

          {loading ? (
            <div className="text-gray-500">Loading...</div>
          ) : orders.length === 0 ? (
            <div className="text-gray-500">No orders yet.</div>
          ) : (
            <div className="space-y-20">
              {orders.map((order) => (
                <section key={order.orderId || order.id}>
                  <h3 className="sr-only">
                    Order placed on <time dateTime={order.createdAt || order.date}>{formatDate(order.createdAt || order.date)}</time>
                  </h3>

                  <div className="bg-gray-50 rounded-lg py-6 px-4 md:px-6 sm:flex sm:items-baseline sm:justify-between">
                    <dl className="flex space-x-6 divide-x divide-gray-200 text-sm sm:flex-1">
                      <div className="flex-1">
                        <dt className="font-medium text-gray-900">Order number</dt>
                        <dd className="mt-1 text-gray-500">{order.orderId || order.id}</dd>
                      </div>
                      <div className="pl-6">
                        <dt className="font-medium text-gray-900">Date placed</dt>
                        <dd className="mt-1 text-gray-500">
                          <time dateTime={order.createdAt || order.date}>{formatDate(order.createdAt || order.date)}</time>
                        </dd>
                      </div>
                      <div className="pl-6">
                        <dt className="font-medium text-gray-900">Total amount</dt>
                        <dd className="mt-1 font-medium text-gray-900">
                          {currency(order.total)}
                        </dd>
                      </div>
                      <div className="pl-6">
                        <dt className="font-medium text-gray-900">Status</dt>
                        <dd className="mt-1">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            {order.status || 'Paid'}
                          </span>
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-6 space-y-4 sm:mt-0 sm:ml-6 sm:flex-none">
                      <button
                        type="button"
                        className="w-full flex items-center justify-center bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto"
                      >
                        View Invoice
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 flow-root">
                    <div className="-my-6 divide-y divide-gray-200">
                      {(order.items || []).map((item, idx) => (
                        <div key={`${order.orderId}-item-${idx}`} className="py-6 sm:flex">
                          <div className="flex-shrink-0">
                            {item.image ? (
                              <Image
                                src={item.image}
                                alt={item.name || 'Product image'}
                                width={128}
                                height={128}
                                className="w-32 h-32 rounded-md object-center object-cover"
                              />
                            ) : (
                              <div className="w-32 h-32 rounded-md bg-gray-200 flex items-center justify-center text-gray-400">
                                <span className="text-xs">No image</span>
                              </div>
                            )}
                          </div>

                          <div className="mt-4 sm:mt-0 sm:ml-6">
                            <h4 className="text-sm">
                              <span className="font-medium text-gray-700 hover:text-gray-800">
                                {item.name}
                              </span>
                            </h4>
                            <p className="mt-1 text-sm text-gray-500">Qty {item.quantity}</p>
                            <p className="mt-1 font-medium text-gray-900">{currency(item.price)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
