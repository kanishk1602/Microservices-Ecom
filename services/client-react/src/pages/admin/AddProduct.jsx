import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, ArrowLeft, Plus, X, Upload, Package,
  LayoutDashboard, ShoppingCart, LogOut, Tag, Image
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useProducts } from '../../context/ProductContext';

const CATEGORIES = ['Shoes', 'Clothing', 'Accessories', 'Electronics', 'Home & Garden', 'Sports'];
const BADGES = ['', 'New', 'Sale', 'Bestseller', 'Hot', 'Premium', 'Trending', 'Limited'];

export default function AddProduct() {
  const navigate = useNavigate();
  const { adminUser, adminLogout } = useAdmin();
  const { addProduct } = useProducts();

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    originalPrice: '',
    category: 'Clothing',
    badge: '',
    image: '',
    rating: '4.5',
    reviews: '0',
    colors: ['#000000']
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [newColor, setNewColor] = useState('#000000');

  const handleLogout = () => {
    adminLogout();
    navigate('/admin/login');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const addColor = () => {
    if (!formData.colors.includes(newColor)) {
      setFormData(prev => ({ ...prev, colors: [...prev.colors, newColor] }));
    }
  };

  const removeColor = (colorToRemove) => {
    setFormData(prev => ({
      ...prev,
      colors: prev.colors.filter(c => c !== colorToRemove)
    }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Product name is required';
    if (!formData.price || parseFloat(formData.price) <= 0) newErrors.price = 'Valid price is required';
    if (!formData.image.trim()) newErrors.image = 'Product image URL is required';
    if (!formData.category) newErrors.category = 'Category is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);

    const product = {
      name: formData.name.trim(),
      price: parseFloat(formData.price),
      originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : null,
      category: formData.category,
      badge: formData.badge || null,
      image: formData.image.trim(),
      rating: parseFloat(formData.rating) || 4.5,
      reviews: parseInt(formData.reviews) || 0,
      colors: formData.colors
    };

    setTimeout(async () => {
      const res = await addProduct(product);
      setSaving(false);
      if (res.success) {
        navigate('/admin/dashboard');
      } else {
        alert('Failed to add product: ' + (res.message || 'unknown'));
      }
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 shadow-xl">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-center h-16 bg-slate-800">
            <ShoppingBag className="h-8 w-8 text-purple-400" />
            <span className="ml-2 text-xl font-bold text-white">ShopNow</span>
            <span className="ml-2 text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">Admin</span>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-2">
            <Link 
              to="/admin/dashboard" 
              className="flex items-center px-4 py-3 text-gray-300 hover:bg-slate-800 rounded-lg transition"
            >
              <LayoutDashboard className="h-5 w-5 mr-3" />
              Dashboard
            </Link>
            <Link 
              to="/admin/products/add" 
              className="flex items-center px-4 py-3 text-white bg-purple-600/20 rounded-lg border-l-4 border-purple-500"
            >
              <Plus className="h-5 w-5 mr-3" />
              Add Product
            </Link>
            <Link 
              to="/" 
              className="flex items-center px-4 py-3 text-gray-300 hover:bg-slate-800 rounded-lg transition"
            >
              <ShoppingCart className="h-5 w-5 mr-3" />
              View Store
            </Link>
          </nav>

          <div className="p-4 border-t border-slate-700">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium">A</span>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-white">{adminUser?.name || 'Admin'}</p>
                <p className="text-xs text-gray-400">{adminUser?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-4 w-full flex items-center justify-center px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Link
            to="/admin/dashboard"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition mr-4"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add New Product</h1>
            <p className="text-gray-500 mt-1">Fill in the product details below</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="max-w-4xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Package className="h-5 w-5 mr-2 text-purple-600" />
                  Basic Information
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                        errors.name ? 'border-red-500' : 'border-gray-200'
                      }`}
                      placeholder="e.g., Premium Cotton T-Shirt"
                    />
                    {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category *
                      </label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        {CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Badge
                      </label>
                      <select
                        name="badge"
                        value={formData.badge}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        {BADGES.map(badge => (
                          <option key={badge} value={badge}>{badge || 'None'}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Image URL *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        name="image"
                        value={formData.image}
                        onChange={handleChange}
                        className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                          errors.image ? 'border-red-500' : 'border-gray-200'
                        }`}
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>
                    {errors.image && <p className="mt-1 text-sm text-red-500">{errors.image}</p>}
                    <p className="mt-1 text-xs text-gray-400">Use Unsplash URLs like: https://images.unsplash.com/photo-xxx?w=400</p>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Tag className="h-5 w-5 mr-2 text-purple-600" />
                  Pricing
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Selling Price (₹) *
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                        errors.price ? 'border-red-500' : 'border-gray-200'
                      }`}
                      placeholder="999"
                      min="0"
                      step="0.01"
                    />
                    {errors.price && <p className="mt-1 text-sm text-red-500">{errors.price}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Original Price (₹)
                    </label>
                    <input
                      type="number"
                      name="originalPrice"
                      value={formData.originalPrice}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="1299 (for discount display)"
                      min="0"
                      step="0.01"
                    />
                    <p className="mt-1 text-xs text-gray-400">Set higher than selling price to show discount</p>
                  </div>
                </div>

                {formData.price && formData.originalPrice && parseFloat(formData.originalPrice) > parseFloat(formData.price) && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-700">
                      Discount: {Math.round((1 - parseFloat(formData.price) / parseFloat(formData.originalPrice)) * 100)}% off
                    </p>
                  </div>
                )}
              </div>

              {/* Colors */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Colors</h2>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {formData.colors.map(color => (
                    <div key={color} className="flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1">
                      <div 
                        className="w-4 h-4 rounded-full border border-gray-300" 
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs text-gray-600">{color}</span>
                      <button
                        type="button"
                        onClick={() => removeColor(color)}
                        className="ml-1 text-gray-400 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="h-10 w-16 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="#000000"
                  />
                  <button
                    type="button"
                    onClick={addColor}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Preview */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Image className="h-5 w-5 mr-2 text-purple-600" />
                  Preview
                </h2>
                
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
                  {formData.image ? (
                    <img 
                      src={formData.image} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Upload className="h-12 w-12 text-gray-300" />
                    </div>
                  )}
                </div>

                <div>
                  <p className="font-medium text-gray-900 truncate">{formData.name || 'Product Name'}</p>
                  <p className="text-sm text-gray-500">{formData.category}</p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-lg font-bold text-gray-900">
                      ₹{formData.price || '0'}
                    </span>
                    {formData.originalPrice && parseFloat(formData.originalPrice) > parseFloat(formData.price) && (
                      <span className="text-sm text-gray-400 line-through">
                        ₹{formData.originalPrice}
                      </span>
                    )}
                  </div>
                  {formData.badge && (
                    <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                      {formData.badge}
                    </span>
                  )}
                </div>
              </div>

              {/* Additional Info */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Info</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rating (1-5)
                    </label>
                    <input
                      type="number"
                      name="rating"
                      value={formData.rating}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      min="1"
                      max="5"
                      step="0.1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reviews Count
                    </label>
                    <input
                      type="number"
                      name="reviews"
                      value={formData.reviews}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full flex items-center justify-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 shadow-lg shadow-purple-200"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus className="h-5 w-5 mr-2" />
                      Add Product
                    </>
                  )}
                </button>

                <Link
                  to="/admin/dashboard"
                  className="w-full flex items-center justify-center px-6 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                  Cancel
                </Link>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
