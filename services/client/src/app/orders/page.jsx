'use client';

export default function OrdersPage() {
  const orders = [
    {
      id: 'WUISKOALS',
      date: 'July 3, 2023',
      status: 'Delivered',
      total: 309.80,
      items: [
        {
          id: 1,
          name: 'Nike Air Max',
          price: 129.90,
          quantity: 1,
          image: '/product1.png',
        },
        {
          id: 2,
          name: 'Adidas Ultraboost',
          price: 179.90,
          quantity: 1,
          image: '/product2.png',
        },
      ],
    },
    // Add more orders as needed
  ];

  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-extrabold text-gray-900">Order History</h1>
        <p className="mt-2 text-sm text-gray-500">
          Check the status of recent orders, manage returns, and download invoices.
        </p>

        <div className="mt-12">
          <h2 className="sr-only">Recent orders</h2>

          <div className="space-y-20">
            {orders.map((order) => (
              <section key={order.id}>
                <h3 className="sr-only">
                  Order placed on <time dateTime={order.datetime}>{order.date}</time>
                </h3>

                <div className="bg-gray-50 rounded-lg py-6 px-4 md:px-6 sm:flex sm:items-baseline sm:justify-between">
                  <dl className="flex space-x-6 divide-x divide-gray-200 text-sm sm:flex-1">
                    <div className="flex-1">
                      <dt className="font-medium text-gray-900">Order number</dt>
                      <dd className="mt-1 text-gray-500">{order.id}</dd>
                    </div>
                    <div className="pl-6">
                      <dt className="font-medium text-gray-900">Date placed</dt>
                      <dd className="mt-1 text-gray-500">
                        <time dateTime={order.datetime}>{order.date}</time>
                      </dd>
                    </div>
                    <div className="pl-6">
                      <dt className="font-medium text-gray-900">Total amount</dt>
                      <dd className="mt-1 font-medium text-gray-900">
                        ${order.total.toFixed(2)}
                      </dd>
                    </div>
                    <div className="pl-6">
                      <dt className="font-medium text-gray-900">Status</dt>
                      <dd className="mt-1">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {order.status}
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
                    {order.items.map((item) => (
                      <div key={item.id} className="py-6 sm:flex">
                        <div className="flex-shrink-0">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-24 h-24 rounded-md object-center object-cover sm:w-32 sm:h-32"
                          />
                        </div>

                        <div className="mt-4 sm:mt-0 sm:ml-6">
                          <h4 className="text-sm">
                            <a href="#" className="font-medium text-gray-700 hover:text-gray-800">
                              {item.name}
                            </a>
                          </h4>
                          <p className="mt-1 text-sm text-gray-500">Qty {item.quantity}</p>
                          <p className="mt-1 font-medium text-gray-900">${item.price.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
