'use client';

import { StarIcon } from '@heroicons/react/24/solid';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

export default function ShopPage() {
  const [products] = useState([
    {
      id: 1,
      name: 'Nike Air Max',
      price: 129.99,
      rating: 4.5,
      reviewCount: 24,
      imageSrc: '/product1.png',
      imageAlt: 'Nike Air Max shoes',
      colors: ['#111827', '#F3F4F6'],
      category: 'Shoes',
    },
    // Add more products as needed
  ]);

  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Shop</h1>
        
        {/* Product Grid */}
        <div className="mt-6 grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
          {products.map((product) => (
            <div key={product.id} className="group relative">
              <div className="w-full min-h-80 bg-gray-200 aspect-w-1 aspect-h-1 rounded-md overflow-hidden group-hover:opacity-75 lg:h-80 lg:aspect-none">
                <Image
                  src={product.imageSrc}
                  alt={product.imageAlt}
                  width={400}
                  height={500}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="mt-4 flex justify-between">
                <div>
                  <h3 className="text-sm text-gray-700">
                    <Link href={`/product/${product.id}`}>
                      <span aria-hidden="true" className="absolute inset-0" />
                      {product.name}
                    </Link>
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">{product.category}</p>
                </div>
                <p className="text-sm font-medium text-gray-900">${product.price}</p>
              </div>
              <div className="mt-2">
                <div className="flex items-center">
                  {[0, 1, 2, 3, 4].map((rating) => (
                    <StarIcon
                      key={rating}
                      className={`${
                        product.rating > rating ? 'text-yellow-400' : 'text-gray-200'
                      } h-5 w-5 flex-shrink-0`}
                      aria-hidden="true"
                    />
                  ))}
                  <span className="ml-2 text-sm text-gray-600">({product.reviewCount})</span>
                </div>
              </div>
              <div className="mt-4">
                <button
                  className="w-full bg-indigo-600 border border-transparent rounded-md py-2 px-4 flex items-center justify-center text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Add to cart
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
