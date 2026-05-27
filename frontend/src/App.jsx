import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import GetCovered from './pages/GetCovered';
import MyPolicies from './pages/MyPolicies';
import LiveFeed from './pages/LiveFeed';
import HowItWorks from './pages/HowItWorks';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col relative overflow-x-hidden">
        {/* Background glow effects */}
        <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none"></div>
        <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/5 blur-[120px] pointer-events-none"></div>
        
        <Navbar />
        
        <main className="flex-grow z-10">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/get-covered" element={<GetCovered />} />
            <Route path="/my-policies" element={<MyPolicies />} />
            <Route path="/live-feed" element={<LiveFeed />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
