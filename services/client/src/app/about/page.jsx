'use client';

export default function AboutPage() {
  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            About Us
          </h1>
          <p className="mt-4 text-xl text-gray-500">
            We're on a mission to provide the best shopping experience.
          </p>
        </div>

        <div className="mt-20">
          <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
            <div className="relative">
              <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Fast Delivery</p>
              <p className="mt-2 ml-16 text-base text-gray-500">
                Get your products delivered in record time with our fast and reliable shipping.
              </p>
            </div>

            <div className="relative">
              <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              </div>
              <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Quality Products</p>
              <p className="mt-2 ml-16 text-base text-gray-500">
                We source only the highest quality products from trusted suppliers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
