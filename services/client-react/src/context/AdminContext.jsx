import { createContext, useContext, useState, useEffect } from 'react';

const AdminContext = createContext();

export function AdminProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if logged in user has admin role
    checkAdminStatus();
    
    // Listen for storage changes (login/logout from another tab)
    window.addEventListener('storage', checkAdminStatus);
    return () => window.removeEventListener('storage', checkAdminStatus);
  }, []);

  const checkAdminStatus = () => {
    setLoading(true);
    try {
      const userStr = localStorage.getItem('user');
      const token = localStorage.getItem('authToken');
      
      if (userStr && token) {
        const user = JSON.parse(userStr);
        // Check if user has Admin role
        if (user.role === 'Admin') {
          setAdminUser(user);
          setIsAdmin(true);
        } else {
          setAdminUser(null);
          setIsAdmin(false);
        }
      } else {
        setAdminUser(null);
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setAdminUser(null);
      setIsAdmin(false);
    }
    setLoading(false);
  };

  const adminLogout = () => {
    // Clear all auth data
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    setAdminUser(null);
    setIsAdmin(false);
  };

  // Refresh admin status - call this after login
  const refreshAdminStatus = () => {
    checkAdminStatus();
  };

  return (
    <AdminContext.Provider value={{ 
      isAdmin, 
      adminUser, 
      adminLogout, 
      loading,
      refreshAdminStatus,
      checkAdminStatus
    }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
