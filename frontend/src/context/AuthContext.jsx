import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

// Create a context for authentication
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for an existing session when the app loads
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for changes in authentication state (e.g., login, logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    // Clean up the subscription on unmount
    return () => subscription.unsubscribe();
  }, []);

  const value = {
    session,
    user: session?.user,
    signOut: () => supabase.auth.signOut(),
  };

  // Show a loading indicator while the session is being fetched
  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export function useAuth() {
  return useContext(AuthContext);
}