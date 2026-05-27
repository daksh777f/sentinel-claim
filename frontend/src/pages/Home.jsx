import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CloudRain, Cpu, FileCheck, RefreshCw } from 'lucide-react';
import { useContract } from '../hooks/useContract';
import { formatEther } from 'ethers';

export default function Home() {
  const { contract } = useContract();
  const [stats, setStats] = useState({
    pool: '0',
    premiums: '0',
    claims: '0',
    claimCount: '0'
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (contract) {
        try {
          const result = await contract.getPoolStats();
          setStats({
            pool: formatEther(result[0]),
            premiums: formatEther(result[1]),
            claims: formatEther(result[2]),
            claimCount: result[3].toString()
          });
        } catch (err) {
          console.error("Error fetching stats:", err);
        }
      }
    };
    fetchStats();
    
    // Poll every 15 seconds
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, [contract]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center pt-10 pb-20 px-4">
      {/* Hero Text */}
      <div className="text-center max-w-4xl mx-auto space-y-6 mb-16 animate-fade-in-up">
        <h1 className="text-5xl md:text-6xl text-textHeading font-heading font-bold tracking-tight">
          Insurance That <span className="text-primary">Settles Itself</span>
        </h1>
        <p className="text-lg md:text-xl text-textMain/80 max-w-2xl mx-auto font-body font-light">
          Autonomous parametric claims powered by onchain AI agents. No adjusters. No delays. No disputes.
        </p>
        <div className="pt-4">
          <Link to="/get-covered" className="btn-primary text-lg px-8 py-3 inline-block font-bold">
            Get Covered
          </Link>
        </div>
      </div>

      {/* Animated Flow Diagram */}
      <div className="w-full max-w-5xl mx-auto relative mb-20">
        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white/10 -translate-y-1/2 hidden md:block">
          <div className="absolute top-0 h-full bg-primary/80 shadow-[0_0_10px_#00e5c7] w-[10px] rounded-full animate-pulse-travel"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          <div className="glass-card p-6 flex flex-col items-center text-center space-y-4">
            <div className="bg-primary/10 p-4 rounded-full border border-primary/20">
              <CloudRain className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-heading font-semibold text-lg">Weather Event</h3>
          </div>
          
          <div className="glass-card p-6 flex flex-col items-center text-center space-y-4">
            <div className="bg-secondary/10 p-4 rounded-full border border-secondary/20">
              <Cpu className="h-8 w-8 text-secondary" />
            </div>
            <h3 className="font-heading font-semibold text-lg">Agent Verifies</h3>
          </div>
          
          <div className="glass-card p-6 flex flex-col items-center text-center space-y-4">
            <div className="bg-danger/10 p-4 rounded-full border border-danger/20">
              <FileCheck className="h-8 w-8 text-danger" />
            </div>
            <h3 className="font-heading font-semibold text-lg">Contract Pays</h3>
          </div>
          
        </div>
      </div>

      {/* Stats Bar */}
      <div className="w-full max-w-5xl mx-auto glass-card p-6 md:p-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10 text-center">
          <div className="space-y-2">
            <p className="text-sm text-textMain/60 uppercase tracking-wider font-semibold">Risk Pool Size</p>
            <p className="text-2xl md:text-3xl font-mono text-primary font-bold">{parseFloat(stats.pool).toFixed(2)} <span className="text-sm text-textMain/50">STT</span></p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-textMain/60 uppercase tracking-wider font-semibold">Total Policies</p>
            <p className="text-2xl md:text-3xl font-mono text-textHeading font-bold">--</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-textMain/60 uppercase tracking-wider font-semibold">Claims Settled</p>
            <p className="text-2xl md:text-3xl font-mono text-textHeading font-bold">{stats.claimCount}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-textMain/60 uppercase tracking-wider font-semibold">Avg Settlement</p>
            <p className="text-2xl md:text-3xl font-mono text-secondary font-bold">&lt; 1 <span className="text-sm text-textMain/50">min</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
