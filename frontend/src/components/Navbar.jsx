import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, AlertTriangle } from 'lucide-react';
import { useContract } from '../hooks/useContract';

export default function Navbar() {
  const { account, isConnected, isCorrectChain, connectWallet, switchToSomnia } = useContract();

  const formatAddress = (address) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <nav className="border-b border-white/5 bg-background/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Shield className="text-primary h-8 w-8" />
            <span className="font-heading font-bold text-xl text-textHeading tracking-tight">SentinelClaim</span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex space-x-8">
            <Link to="/" className="text-textMain hover:text-primary transition-colors">Home</Link>
            <Link to="/get-covered" className="text-textMain hover:text-primary transition-colors">Get Covered</Link>
            <Link to="/my-policies" className="text-textMain hover:text-primary transition-colors">My Policies</Link>
            <Link to="/live-feed" className="text-textMain hover:text-primary transition-colors">Live Feed</Link>
            <Link to="/how-it-works" className="text-textMain hover:text-primary transition-colors">How It Works</Link>
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            {isConnected && !isCorrectChain && (
              <button 
                onClick={switchToSomnia}
                className="flex items-center space-x-2 bg-secondary/10 text-secondary border border-secondary/20 px-3 py-1.5 rounded-[8px] text-sm font-medium hover:bg-secondary/20 transition-colors"
              >
                <AlertTriangle className="h-4 w-4" />
                <span>Switch to Somnia</span>
              </button>
            )}

            {!isConnected ? (
              <button onClick={connectWallet} className="btn-primary text-sm">
                Connect Wallet
              </button>
            ) : (
              <div className="bg-card border border-white/5 px-4 py-2 rounded-[8px] font-mono text-sm shadow-sm">
                {formatAddress(account)}
              </div>
            )}
          </div>
          
        </div>
      </div>
    </nav>
  );
}
