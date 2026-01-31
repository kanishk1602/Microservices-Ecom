import { createContext, useContext, useState, useEffect } from 'react';

const ProductContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export function ProductProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const normalize = (p) => ({ ...p, id: p._id });

  async function fetchProducts() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/products`);
      const data = await res.json();
      if (res.ok && data.products) {
        setProducts(data.products.map(normalize));
      } else {
        setError(data.message || 'Failed to fetch products');
      }
    } catch (err) {
      console.error('Fetch products error', err);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
  };

  const addProduct = async (product) => {
    try {
      console.log('Adding product:', product);
      console.log('API URL:', `${API_URL}/api/v1/products`);
      console.log('Headers:', getAuthHeaders());
      
      const res = await fetch(`${API_URL}/api/v1/products`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(product),
      });
      
      console.log('Response status:', res.status);
      const data = await res.json();
      console.log('Response data:', data);
      
      if (res.ok && data.product) {
        const np = normalize(data.product);
        setProducts(prev => [np, ...prev]);
        return { success: true, product: np };
      }
      return { success: false, message: data.message || `HTTP ${res.status}: ${res.statusText}` };
    } catch (err) {
      console.error('Add product error', err);
      return { success: false, message: `Network error: ${err.message}` };
    }
  };

  const updateProduct = async (id, updatedData) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/products/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updatedData),
      });
      const data = await res.json();
      if (res.ok && data.product) {
        const np = normalize(data.product);
        setProducts(prev => prev.map(p => (p._id === np._id ? np : p)));
        return { success: true, product: np };
      }
      return { success: false, message: data.message || 'Failed to update' };
    } catch (err) {
      console.error('Update product error', err);
      return { success: false, message: 'Network error' };
    }
  };

  const deleteProduct = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/products/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProducts(prev => prev.filter(p => p._id !== id && p.id !== id));
        return { success: true };
      }
      return { success: false, message: data.message || 'Failed to delete' };
    } catch (err) {
      console.error('Delete product error', err);
      return { success: false, message: 'Network error' };
    }
  };

  const getProduct = (id) => {
    if (!id) return null;
    return products.find(p => p._id === id || p.id === id || String(p._id) === String(id)) || null;
  };

  const resetProducts = async () => {
    // Resetting products is a backend concern. If server exposes a reset endpoint or seeder,
    // call it here. For now, re-fetch from server to refresh state.
    await fetchProducts();
  };

  return (
    <ProductContext.Provider value={{ 
      products, 
      loading,
      error,
      fetchProducts,
      addProduct, 
      updateProduct, 
      deleteProduct, 
      getProduct,
      resetProducts,
    }}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
}
