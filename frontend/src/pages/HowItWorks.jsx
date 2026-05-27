import React from 'react';
import { CreditCard, Cpu, Network, Zap } from 'lucide-react';

export default function HowItWorks() {
  return (
    <div className="max-w-5xl mx-auto py-12 px-4 pb-24">
      <h1 className="text-4xl font-heading font-bold mb-4 text-center">How It Works</h1>
      <p className="text-textMain/70 text-center max-w-2xl mx-auto mb-16 text-lg">
        SentinelClaim completely removes humans from the insurance loop.
      </p>

      {/* Timeline */}
      <div className="relative border-l border-white/10 ml-6 md:ml-12 mb-24 space-y-12">
        
        <div className="relative pl-10 md:pl-16">
          <div className="absolute -left-6 bg-card border-2 border-primary w-12 h-12 rounded-full flex items-center justify-center font-bold text-primary text-xl shadow-[0_0_15px_rgba(0,229,199,0.3)]">
            1
          </div>
          <div className="glass-card p-6 md:p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-primary/10 rounded-lg text-primary">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-heading font-semibold">Buy Coverage</h3>
            </div>
            <p className="text-textMain/80 leading-relaxed">
              User deposits STT tokens and specifies location + weather threshold. The premium is algorithmically calculated based on the risk profile of the requested threshold.
            </p>
          </div>
        </div>

        <div className="relative pl-10 md:pl-16">
          <div className="absolute -left-6 bg-card border-2 border-primary w-12 h-12 rounded-full flex items-center justify-center font-bold text-primary text-xl shadow-[0_0_15px_rgba(0,229,199,0.3)]">
            2
          </div>
          <div className="glass-card p-6 md:p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-primary/10 rounded-lg text-primary">
                <Network className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-heading font-semibold">Onchain Agent Monitors</h3>
            </div>
            <p className="text-textMain/80 leading-relaxed">
              Somnia Agents fetch live weather data from external APIs, directly from inside the smart contract. No oracles. No middleware.
            </p>
          </div>
        </div>

        <div className="relative pl-10 md:pl-16">
          <div className="absolute -left-6 bg-card border-2 border-primary w-12 h-12 rounded-full flex items-center justify-center font-bold text-primary text-xl shadow-[0_0_15px_rgba(0,229,199,0.3)]">
            3
          </div>
          <div className="glass-card p-6 md:p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-primary/10 rounded-lg text-primary">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-heading font-semibold">AI Validates Onchain</h3>
            </div>
            <p className="text-textMain/80 leading-relaxed">
              Multiple validators independently verify the weather data and reach consensus. The claim decision is made by the blockchain itself based on the deterministic rules of the policy.
            </p>
          </div>
        </div>

        <div className="relative pl-10 md:pl-16">
          <div className="absolute -left-6 bg-card border-2 border-primary w-12 h-12 rounded-full flex items-center justify-center font-bold text-primary text-xl shadow-[0_0_15px_rgba(0,229,199,0.3)]">
            4
          </div>
          <div className="glass-card p-6 md:p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-primary/10 rounded-lg text-primary">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-heading font-semibold">Instant Settlement</h3>
            </div>
            <p className="text-textMain/80 leading-relaxed">
              If the threshold is breached, the contract autonomously transfers the payout. Total time: under 60 seconds.
            </p>
          </div>
        </div>
      </div>

      {/* Why Somnia */}
      <h2 className="text-3xl font-heading font-bold mb-10 text-center border-t border-white/10 pt-16">Why This Only Works on Somnia</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-card p-6 border-t-4 border-t-primary">
          <h4 className="text-lg font-bold mb-3 text-white">Native API Access</h4>
          <p className="text-sm text-textMain/70 leading-relaxed">
            Smart contracts on Somnia can query any HTTP API directly from Solidity. No Chainlink. No oracle middlemen.
          </p>
        </div>
        
        <div className="glass-card p-6 border-t-4 border-t-purple-500">
          <h4 className="text-lg font-bold mb-3 text-white">1M+ TPS, Sub-Second Finality</h4>
          <p className="text-sm text-textMain/70 leading-relaxed">
            Fast enough for real-time insurance. Cheap enough for micro-policies.
          </p>
        </div>
      </div>
    </div>
  );
}
