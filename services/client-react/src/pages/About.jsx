import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';

export default function About() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex-shrink-0 flex items-center">
                <ShoppingBag className="h-8 w-8 text-indigo-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">ShopNow</span>
              </Link>
            </div>
            <div className="hidden md:ml-6 md:flex md:items-center md:space-x-8">
              <Link to="/" className="text-gray-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-gray-300 text-sm font-medium">
                Home
              </Link>
              <Link to="/shop" className="text-gray-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-gray-300 text-sm font-medium">
                Shop
              </Link>
              <Link to="/about" className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-indigo-500 text-sm font-medium">
                About
              </Link>
              <Link to="/orders" className="text-gray-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-gray-300 text-sm font-medium">
                My Orders
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-extrabold text-gray-900">About Us</h1>
        <div className="mt-6 prose prose-indigo prose-lg text-gray-500">
          <p>
            ShopNow is a modern e-commerce platform built with microservices architecture.
            We provide a seamless shopping experience with secure payment processing through
            Stripe and Razorpay.
          </p>
          <p>
            Our platform is designed to be scalable, reliable, and user-friendly. We use
            cutting-edge technologies including React, Node.js, and Kafka for event-driven
            communication between services.
          </p>
        </div>
      </div>
    </div>
  );
}
