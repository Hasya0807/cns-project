import React, { useState, useEffect } from 'react';
import ChatComponent from './components/ChatComponent';
import AuthComponent from './components/AuthComponent';
import './App.css';

function App() {
  const [user, setUser] = useState(null);

  // Check if user is already logged in
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
  }, []);

  const handleAuthSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
  };

  if (!user) {
    return <AuthComponent onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="App">
      <ChatComponent 
        currentUserId={user.id} 
        currentUsername={user.username}
      />
      <button
        onClick={handleLogout}
        className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
      >
        Logout
      </button>
    </div>
  );
}

export default App;
