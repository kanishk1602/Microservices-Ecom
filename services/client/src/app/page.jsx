'use client';

import { ShoppingBag, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect } from 'react';

// Payment service base URL
const PAYMENT_URL = process.env.NEXT_PUBLIC_PAYMENT_URL || "http://localhost:4002";

const products = [
  {
    id: 1,
    name: "Nike Air Max",
    price: 129.9,
    image: "/product1.png",
    category: "Shoes",
    rating: 4.8,
    description: "Premium running shoes with responsive cushioning and breathable mesh upper for all-day comfort.",
  },
  {
    id: 2,
    name: "Adidas Superstar Cap",
    price: 29.9,
    image: "/product2.png",
    category: "Accessories",
    rating: 4.5,
    description: "Classic cap with embroidered logo and adjustable strap for the perfect fit.",
  },
  {
    id: 3,
    name: "Puma Yellow T-Shirt",
    price: 49.9,
    image: "/product3.png",
    category: "Clothing",
    rating: 4.7,
    description: "Lightweight cotton t-shirt with a modern fit and moisture-wicking technology.",
  },
];

const categories = ["All", "Shoes", "Clothing", "Accessories", "Sale"];

import { useRouter } from "next/navigation";

export default function Page() {

  const router = useRouter();
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Redirect to /login if not logged in
  useEffect(() => {
    if (typeof window !== "undefined") {
      const user = localStorage.getItem("user");
      if (!user) {
        router.replace("/login");
      }
    }
  }, [router]);
  const cartRef = useRef(null);

  // Close cart when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (cartRef.current && !cartRef.current.contains(event.target)) {
        // Check if the click is not on the cart button
        const cartButton = document.querySelector('[aria-label="View cart"]');
        if (cartButton && !cartButton.contains(event.target)) {
          setIsCartOpen(false);
        }
      }
    }

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      // Clean up
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  const [cart, setCart] = useState([
    {
      id: 1,
      name: "Nike Air Max",
      price: 129.9,
      image: "/product1.png",
      description: "Premium running shoes with responsive cushioning...",
      quantity: 1
    },
    {
      id: 2,
      name: "Adidas Ultraboost",
      price: 179.9,
      image: "/product2.png",
      description: "High-performance running shoes with Boost technology...",
      quantity: 1
    }
  ]);

  const handleAddToCart = (product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      // Show toast notification
      if (typeof window !== 'undefined') {
        alert(`${product.name} added to cart!`);
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const handleRemoveFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  // Quantity update functionality can be added back when needed
  // const handleUpdateQuantity = (productId, newQuantity) => {
  //   if (newQuantity < 1) return;
  //   setCart(prevCart =>
  //     prevCart.map(item =>
  //       item.id === productId ? { ...item, quantity: newQuantity } : item
  //     )
  //   );
  // };

  const loadScript = (src) => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => {
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  const handlePlaceOrder = async () => {
    try {
      // Ensure Razorpay script is loaded
      if (typeof window.Razorpay !== 'function') {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        await new Promise(resolve => {
          script.onload = resolve;
          script.onerror = () => {
            alert('Failed to load Razorpay SDK');
            resolve();
          };
        });
        if (typeof window.Razorpay !== 'function') {
          alert('Razorpay SDK not loaded');
          return;
        }
      }

      // 1. Create order on backend
      const orderResponse = await fetch(`${PAYMENT_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: subtotal,
          receipt: 'order_' + Date.now(),
          notes: {
            items: JSON.stringify(cart.map(item => ({
              id: item.id,
              name: item.name,
              price: item.price,
              quantity: item.quantity
            }))),
            email: (typeof window !== "undefined" && localStorage.getItem("user")) ? JSON.parse(localStorage.getItem("user")).email : ""
          }
        })
      });

      const data = await orderResponse.json();
      const order = data.order;

      if (!order || !order.id) {
        alert('Failed to create order');
        return;
      }

      // 2. Open Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: 'Your Store',
        description: 'Order Payment',
        order_id: order.id,
        handler: async function(response) {
          try {
            // 3. Verify payment on backend
            const verificationResponse = await fetch(`${PAYMENT_URL}/api/verify-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                email: (typeof window !== "undefined" && localStorage.getItem("user")) ? JSON.parse(localStorage.getItem("user")).email : ""
              })
            });
            const result = await verificationResponse.json();

            if (result.success) {
              setCart([]);
              setIsCartOpen(false);
              alert('Order placed successfully!');
            } else {
              alert('Payment verification failed');
            }
          } catch (err) {
            alert('Payment verification error');
          }
        },
        prefill: {
          name: 'Customer Name',
          email: 'customer@example.com',
          contact: '9999999999'
        },
        theme: {
          color: '#4F46E5'
        }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.on('payment.failed', function(response) {
        alert(`Payment failed: ${response.error.description}`);
      });
      paymentObject.open();
    } catch (error) {
      alert('Order/payment error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex-shrink-0 flex items-center">
                <ShoppingBag className="h-8 w-8 text-indigo-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">ShopNow</span>
              </Link>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:ml-6 md:flex md:items-center md:space-x-8">
              <Link href="/" className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-indigo-500 text-sm font-medium">
                Home
              </Link>
              <Link href="/shop" className="text-gray-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-gray-300 text-sm font-medium">
                Shop
              </Link>
              <Link href="/about" className="text-gray-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-gray-300 text-sm font-medium">
                About
              </Link>
              <Link href="/contact" className="text-gray-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-gray-300 text-sm font-medium">
                Contact
              </Link>
              <Link href="/orders" className="text-gray-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-gray-300 text-sm font-medium">
                My Orders
              </Link>
            </div>
            
            <div className="flex items-center">
              <div className="flex-shrink-0 relative">
                <button
                  type="button"
                  onClick={() => setIsCartOpen(!isCartOpen)}
                  className="relative p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <span className="sr-only">View cart</span>
                  <ShoppingBag className="h-6 w-6 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
                  <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {totalItems}
                  </span>
                </button>

                {/* Cart Dropdown */}
                {isCartOpen && (
                  <div ref={cartRef} className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg overflow-hidden z-10">
                    <div className="p-4 border-b">
                      <h3 className="text-lg font-medium text-gray-900">Shopping Cart</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto p-4">
                      {cart.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">Your cart is empty</p>
                      ) : (
                        <div className="space-y-4">
                          {cart.map((item) => (
                            <div key={item.id} className="flex items-center space-x-4">
                              <div className="flex-shrink-0">
                                <Image
                                  src={item.image}
                                  alt={item.name}
                                  width={64}
                                  height={64}
                                  className="h-16 w-16 rounded-md object-cover"
                                />
                              </div>
                              <div className="flex-1">
                                <h4 className="text-sm font-medium text-gray-900 line-clamp-1">{item.name}</h4>
                                <p className="text-sm text-gray-500">${item.price.toFixed(2)} × {item.quantity}</p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveFromCart(item.id);
                                }}
                                className="text-gray-400 hover:text-red-500"
                              >
                                <span className="sr-only">Remove</span>
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {cart.length > 0 && (
                      <div className="border-t p-4 bg-gray-50">
                        <div className="flex justify-between text-base font-medium text-gray-900 mb-4">
                          <p>Subtotal</p>
                          <p>${subtotal.toFixed(2)}</p>
                        </div>
                        <button
                          onClick={handlePlaceOrder}
                          className="w-full bg-indigo-600 border border-transparent rounded-md py-2 px-4 flex items-center justify-center text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          Place Order (${subtotal.toFixed(2)})
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="ml-4 flex items-center md:ml-6">
                <button
                  type="button"
                  className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <span className="sr-only">View notifications</span>
                  <User className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <div className="bg-indigo-700">
          <div className="max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Summer Collection 2023
            </h1>
            <p className="mt-6 text-xl text-indigo-100 max-w-3xl mx-auto">
              Discover our latest arrivals and elevate your style with premium quality products.
            </p>
            <div className="mt-10">
              <Link
                href="/shop"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-indigo-700 bg-white hover:bg-indigo-50"
              >
                Shop Now
              </Link>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {categories.map((category) => (
                <button
                  key={category}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                    category === 'All'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {category}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Product Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product) => (
              <div key={product.id} className="group relative bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden bg-gray-200 group-hover:opacity-75 lg:aspect-none lg:h-80">
                  <Image
                    src={product.image}
                    alt={product.name}
                    width={400}
                    height={500}
                    className="w-full h-full object-cover object-center"
                  />
                  <div className="absolute top-2 right-2 bg-white rounded-full p-1.5 shadow-md">
                    <button className="text-gray-400 hover:text-red-500 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        <Link href={`/product/${product.id}`}>
                          <span aria-hidden="true" className="absolute inset-0" />
                          {product.name}
                        </Link>
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">{product.category}</p>
                    </div>
                    <div className="text-sm font-medium text-gray-900">${product.price.toFixed(2)}</div>
                  </div>
                  <div className="mt-2 flex items-center">
                    {[0, 1, 2, 3, 4].map((rating) => (
                      <svg
                        key={rating}
                        className={`h-4 w-4 ${rating < Math.floor(product.rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                    <span className="ml-1 text-xs text-gray-500">{product.rating}</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">{product.description}</p>
                  <div className="mt-4 flex justify-between items-center">
                    <button 
                      onClick={() => handleAddToCart(product)}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Add to cart
                    </button>
                    <Link href={`/product/${product.id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                      View details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-indigo-50">
          <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              <span className="block">Ready to dive in?</span>
              <span className="block text-indigo-600">Start shopping today.</span>
            </h2>
            <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
              <div className="inline-flex rounded-md shadow">
                <Link
                  href="/shop"
                  className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Shop Now
                </Link>
              </div>
              <div className="ml-3 inline-flex rounded-md shadow">
                <Link
                  href="/sale"
                  className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50"
                >
                  View Sale
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white">
        <div className="max-w-7xl mx-auto py-12 px-4 overflow-hidden sm:px-6 lg:px-8">
          <nav className="-mx-5 -my-2 flex flex-wrap justify-center" aria-label="Footer">
            <div className="px-5 py-2">
              <Link href="/about" className="text-base text-gray-500 hover:text-gray-900">
                About
              </Link>
            </div>
            <div className="px-5 py-2">
              <Link href="/blog" className="text-base text-gray-500 hover:text-gray-900">
                Blog
              </Link>
            </div>
            <div className="px-5 py-2">
              <Link href="/jobs" className="text-base text-gray-500 hover:text-gray-900">
                Jobs
              </Link>
            </div>
            <div className="px-5 py-2">
              <Link href="/press" className="text-base text-gray-500 hover:text-gray-900">
                Press
              </Link>
            </div>
            <div className="px-5 py-2">
              <Link href="/privacy" className="text-base text-gray-500 hover:text-gray-900">
                Privacy
              </Link>
            </div>
            <div className="px-5 py-2">
              <Link href="/terms" className="text-base text-gray-500 hover:text-gray-900">
                Terms
              </Link>
            </div>
          </nav>
          <p className="mt-8 text-center text-base text-gray-400">
            &copy; 2023 ShopNow, Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
