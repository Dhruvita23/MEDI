import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('medibot_user');
    const token = localStorage.getItem('medibot_token');
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.clear();
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
  };

  return (
    <div>
      {!user ? (
        <Login onLoginSuccess={(u) => setUser(u)} />
      ) : (
        <Dashboard currentUser={user} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
