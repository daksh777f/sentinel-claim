import React, { useState, useEffect } from 'react';
import { useContract } from '../hooks/useContract';
import { formatEther } from 'ethers';
import { ExternalLink } from 'lucide-react';

export default function LiveFeed() {
  const { contract, isConnected } = useContract();
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!contract) return;

    const formatAddress = (address) => `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;

    const addEvent = (newEvent) => {
      setEvents(prev => [newEvent, ...prev].slice(0, 50)); // Keep last 50
    };

    const onClaimSettled = (policyId, holder, coverage, rainfall, timestamp, event) => {
      addEvent({
        id: event.log.transactionHash + '-' + event.log.logIndex,
        type: 'ClaimSettled',
        title: 'Claim Settled',
        color: 'bg-danger/20 text-danger border-danger/30',
        policyId: policyId.toString(),
        holder: formatAddress(holder),
        data: `${formatEther(coverage)} STT paid (Rainfall: ${Number(rainfall)/100}mm)`,
        time: new Date(Number(timestamp) * 1000).toLocaleTimeString(),
        txHash: event.log.transactionHash
      });
    };

    const onPolicyCreated = (policyId, holder, lat, lon, coverage, threshold, premium, expiresAt, event) => {
      addEvent({
        id: event.log.transactionHash + '-' + event.log.logIndex,
        type: 'PolicyCreated',
        title: 'New Policy',
        color: 'bg-primary/20 text-primary border-primary/30',
        policyId: policyId.toString(),
        holder: formatAddress(holder),
        data: `${formatEther(coverage)} STT coverage for ${formatEther(premium)} STT`,
        time: new Date().toLocaleTimeString(), // Block timestamp missing in event, use local
        txHash: event.log.transactionHash
      });
    };

    contract.on("ClaimSettled", onClaimSettled);
    contract.on("PolicyCreated", onPolicyCreated);

    return () => {
      contract.off("ClaimSettled", onClaimSettled);
      contract.off("PolicyCreated", onPolicyCreated);
    };
  }, [contract]);

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-4xl font-heading font-bold">Live Feed</h1>
        <div className="flex items-center space-x-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
          </span>
          <span className="text-sm text-primary font-mono uppercase tracking-widest">Listening</span>
        </div>
      </div>

      {!isConnected && (
        <div className="bg-secondary/10 border border-secondary/20 text-secondary p-4 rounded-lg mb-8">
          Connect your wallet to connect to the node and listen for live events.
        </div>
      )}

      <div className="space-y-4">
        {events.length === 0 ? (
          <div className="glass-card p-12 text-center border-dashed border-white/20">
            <p className="text-lg text-textMain/60">Listening for onchain events...</p>
            <p className="text-sm text-textMain/40 mt-2">Create a policy and trigger a weather check to see the autonomous loop in action.</p>
          </div>
        ) : (
          events.map((ev, i) => (
            <div key={ev.id} className="glass-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in-up border-l-4" style={{ borderLeftColor: ev.type === 'ClaimSettled' ? '#ff6b6b' : '#00e5c7' }}>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded border ${ev.color} font-mono uppercase`}>
                    {ev.title}
                  </span>
                  <span className="text-xs text-textMain/40 font-mono">{ev.time}</span>
                </div>
                <p className="text-white text-lg">
                  {ev.data}
                </p>
                <div className="flex gap-4 text-sm text-textMain/60 font-mono">
                  <span>Policy: #{ev.policyId}</span>
                  <span>Holder: {ev.holder}</span>
                </div>
              </div>
              
              <a href={`https://testnet.somnia.network/tx/${ev.txHash}`} target="_blank" rel="noreferrer" 
                 className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors text-sm shrink-0 bg-primary/5 px-3 py-2 rounded border border-primary/10">
                <span>View Tx</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
