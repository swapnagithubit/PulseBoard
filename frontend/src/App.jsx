import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import EventExplorer from "./pages/EventExplorer";
import Alerts from "./pages/Alerts";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import Integration from "./pages/Integration";

function Layout() {
  return (
    <div className="flex min-h-screen bg-[#070a13] text-gray-100 overflow-x-hidden">
      {/* Side navigation drawer */}
      <Sidebar />
      
      {/* Main page layout */}
      <div className="flex-grow flex flex-col pl-64 transition-all duration-300">
        {/* Top header navigation */}
        <Navbar />
        
        {/* Pages render area */}
        <main className="flex-grow pt-24 px-8 pb-8 overflow-y-auto max-w-[1400px] mx-auto w-full">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/explorer" element={<EventExplorer />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/integration" element={<Integration />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route 
              path="/*" 
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
