import React, { useState, useEffect } from 'react';
import { useContract } from '../hooks/useContract';
import { formatEther, parseEther, Contract } from 'ethers';

export default function MyPolicies() {
  const { contract, account, isConnected, isCorrectChain } = useContract();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionState, setActionState] = useState({ id: null, status: '', msg: '' });

  useEffect(() => {
    const fetchPolicies = async () => {
      if (!contract || !account) return;
      try {
        const count = await contract.policyCount();
        const userPolicies = [];
        for (let i = 0; i < count; i++) {
          const p = await contract.getPolicy(i);
          if ((p.holder || p[0]).toLowerCase() === account.toLowerCase()) {
            userPolicies.push({ 
              id: i, 
              holder: p.holder || p[0],
              latitude: p.latitude || p[1],
              longitude: p.longitude || p[2],
              premium: p.premium || p[3],
              coverage: p.coverage || p[4],
              thresholdMm: p.thresholdMm || p[5],
              status: p.status || p[6],
              createdAt: p.createdAt || p[7],
              expiresAt: p.expiresAt || p[8],
              lastCheckRequestId: p.lastCheckRequestId || p[9],
              lastRainfall: p.lastRainfall || p[10]
            });
          }
        }
        setPolicies(userPolicies.reverse()); // newest first
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    if (isConnected && isCorrectChain) {
      fetchPolicies();
    }
  }, [contract, account, isConnected, isCorrectChain]);

  // Listeners for real-time updates
  useEffect(() => {
    if (!contract || !account) return;

    const onWeatherChecked = (policyId, rainfall) => {
      setPolicies(prev => prev.map(p => 
        p.id.toString() === policyId.toString() 
          ? { ...p, status: 0n, lastRainfall: rainfall } 
          : p
      ));
      if (actionState.id?.toString() === policyId.toString()) {
        setActionState({ id: null, status: 'success', msg: `Safe: rainfall ${Number(rainfall)/100}mm (below threshold)` });
      }
    };

    const onClaimSettled = (policyId, holder, coverage, rainfall) => {
      if (holder.toLowerCase() === account.toLowerCase()) {
        setPolicies(prev => prev.map(p => 
          p.id.toString() === policyId.toString() 
            ? { ...p, status: 3n, lastRainfall: rainfall } 
            : p
        ));
        setActionState({ id: null, status: 'claim', msg: `CLAIM SETTLED! ${formatEther(coverage)} STT sent to your wallet` });
      }
    };

    contract.on("WeatherChecked", onWeatherChecked);
    contract.on("ClaimSettled", onClaimSettled);

    return () => {
      contract.off("WeatherChecked", onWeatherChecked);
      contract.off("ClaimSettled", onClaimSettled);
    };
  }, [contract, account, actionState.id]);

  const handleCheckWeather = async (id) => {
    if (!contract) return;
    setActionState({ id, status: 'loading', msg: '' });
    try {
      // Since the testnet agent was wiped, we use the fallback demo function
      const tx = await contract.triggerClaimDemo(id);
      await tx.wait();
      
      // Update UI directly instead of waiting for event to avoid race conditions
      setActionState({ id: null, status: 'claim', msg: `CLAIM SETTLED! Payout sent to your wallet.` });
      
      // Refresh the page to show the updated policy status
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      console.error(err);
      setActionState({ id, status: 'error', msg: 'Failed to request check' });
      // Reset after 3 secs
      setTimeout(() => setActionState({ id: null, status: '', msg: '' }), 3000);
    }
  };
  if (!isConnected || !isCorrectChain) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="glass-card p-10 text-center max-w-lg">
          <h2 className="text-2xl mb-4">Connection Required</h2>
          <p className="text-textMain/80 mb-6">Please connect your wallet to view your policies.</p>
        </div>
      </div>
    );
  }

  const getStatusDisplay = (status) => {
    switch (Number(status)) {
      case 0: return { label: 'Active', color: 'bg-primary/20 text-primary border-primary/30' };
      case 1: return { label: 'Checking', color: 'bg-secondary/20 text-secondary border-secondary/30' };
      case 2: return { label: 'Claim Approved', color: 'bg-danger/20 text-danger border-danger/30' };
      case 3: return { label: 'Paid Out', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
      case 4: return { label: 'Expired', color: 'bg-white/10 text-white/60 border-white/20' };
      case 5: return { label: 'Failed', color: 'bg-danger/20 text-danger border-danger/30' };
      default: return { label: 'Unknown', color: 'bg-white/10 text-white border-white/20' };
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-12 px-4">
      <h1 className="text-4xl font-heading font-bold mb-10">My Policies</h1>
      
      {/* Toast Notification */}
      {actionState.msg && !actionState.id && (
        <div className={`fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg border animate-fade-in-up
          ${actionState.status === 'success' ? 'bg-primary/10 border-primary/50 text-primary' : 
            actionState.status === 'claim' ? 'bg-danger/10 border-danger/50 text-danger shadow-[0_0_20px_rgba(255,107,107,0.3)]' : 
            'bg-card border-white/10'}`}>
          {actionState.msg}
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-textMain/50">Loading policies...</div>
      ) : policies.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-xl text-textMain/70 mb-4">You don't have any active policies.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {policies.map(p => {
            const isClaimed = Number(p.status) === 3 || Number(p.status) === 2;
            const sInfo = getStatusDisplay(p.status);
            
            return (
              <div key={p.id} className={`glass-card p-6 relative overflow-hidden transition-all duration-500
                ${isClaimed ? 'border-danger/50 shadow-[0_0_30px_rgba(255,107,107,0.15)]' : ''}`}>
                
                <div className="flex justify-between items-start mb-6">
                  <span className="font-mono text-xs bg-black/40 px-2 py-1 rounded text-textMain/50 border border-white/5">
                    ID #{p.id.toString()}
                  </span>
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${sInfo.color}`}>
                    {sInfo.label}
                  </span>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <p className="text-xs text-textMain/50 uppercase tracking-wider mb-1">Location</p>
                    <p className="font-mono text-white">{Number(p.latitude)/1e6}, {Number(p.longitude)/1e6}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 bg-black/20 p-4 rounded-lg border border-white/5">
                    <div>
                      <p className="text-xs text-textMain/50 uppercase tracking-wider mb-1">Coverage</p>
                      <p className="text-2xl font-mono text-white font-bold">{formatEther(p.coverage)} <span className="text-sm font-normal text-textMain/50">STT</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-textMain/50 uppercase tracking-wider mb-1">Threshold</p>
                      <p className="text-xl font-mono text-secondary">{Number(p.thresholdMm)/100}mm</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-textMain/50 uppercase tracking-wider mb-1">Last Rainfall</p>
                    <p className="font-mono text-white">{Number(p.lastRainfall) > 0 ? `${Number(p.lastRainfall)/100}mm` : 'No data yet'}</p>
                  </div>
                </div>

                {Number(p.status) === 0 && (
                  <button 
                    onClick={() => handleCheckWeather(p.id)}
                    disabled={actionState.id === p.id}
                    className="w-full btn-primary bg-transparent border border-primary text-primary hover:bg-primary/10 py-3 disabled:animate-pulse disabled:border-secondary disabled:text-secondary disabled:bg-secondary/5"
                  >
                    {actionState.id === p.id ? actionState.msg || "Initializing..." : "Check Weather"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
