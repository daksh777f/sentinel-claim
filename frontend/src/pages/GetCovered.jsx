import React, { useState } from 'react';
import { useContract } from '../hooks/useContract';
import { parseEther, formatEther } from 'ethers';

export default function GetCovered() {
  const { contract, isConnected, isCorrectChain } = useContract();
  
  const [formData, setFormData] = useState({
    latitude: '',
    longitude: '',
    coverage: '0.01',
    threshold: '10000' // 100mm default
  });
  
  const [premium, setPremium] = useState('0.00');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', msg: '' });

  const thresholdOptions = [
    { value: '5000', label: 'Light Rain (50mm)', desc: 'Higher premium, more likely to trigger' },
    { value: '10000', label: 'Moderate (100mm)', desc: 'Balanced risk' },
    { value: '20000', label: 'Heavy (200mm)', desc: 'Lower premium, catastrophe only' },
    { value: '30000', label: 'Extreme (300mm)', desc: 'Lowest premium, rare events only' }
  ];

  const calculatePremiumDisplay = async (coverage, threshold) => {
    if (!contract || !coverage || !threshold) return;
    try {
      const coverageWei = parseEther(coverage.toString());
      const premWei = await contract.calculatePremium(coverageWei, parseInt(threshold));
      setPremium(formatEther(premWei));
    } catch (err) {
      console.error(err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      if (name === 'coverage' || name === 'threshold') {
        calculatePremiumDisplay(newData.coverage, newData.threshold);
      }
      return newData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!contract) return;
    
    setLoading(true);
    setStatusMsg({ type: '', msg: '' });
    
    try {
      const latInt = Math.floor(parseFloat(formData.latitude) * 1e6);
      const lonInt = Math.floor(parseFloat(formData.longitude) * 1e6);
      const coverageWei = parseEther(formData.coverage);
      const premWei = parseEther(premium);
      
      const tx = await contract.createPolicy(latInt, lonInt, coverageWei, parseInt(formData.threshold), { value: premWei });
      setStatusMsg({ type: 'info', msg: 'Transaction pending...' });
      
      const receipt = await tx.wait();
      setStatusMsg({ type: 'success', msg: `Policy created! TX: ${receipt.hash}` });
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', msg: err.message || 'Transaction failed' });
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected || !isCorrectChain) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="glass-card p-10 text-center max-w-lg">
          <h2 className="text-2xl mb-4">Connection Required</h2>
          <p className="text-textMain/80 mb-6">Please connect your wallet and switch to the Somnia Testnet to buy a policy.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-4xl font-heading font-bold mb-2">Get Covered</h1>
      <p className="text-textMain/70 mb-10">Configure your parametric weather policy parameters below.</p>

      <form onSubmit={handleSubmit} className="glass-card p-6 md:p-8 space-y-8 relative overflow-hidden">
        
        {/* Location */}
        <div className="space-y-4">
          <h3 className="text-xl font-heading text-primary border-b border-white/5 pb-2">Location</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-textMain/80">Latitude</label>
              <input type="number" step="0.000001" required name="latitude" value={formData.latitude} onChange={handleInputChange}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary font-mono"
                placeholder="e.g. 28.6139" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-textMain/80">Longitude</label>
              <input type="number" step="0.000001" required name="longitude" value={formData.longitude} onChange={handleInputChange}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary font-mono"
                placeholder="e.g. 77.2090" />
            </div>
          </div>
          <p className="text-xs text-textMain/50">Tip: Find your exact coordinates on Google Maps.</p>
        </div>

        {/* Coverage */}
        <div className="space-y-4">
          <h3 className="text-xl font-heading text-primary border-b border-white/5 pb-2">Coverage Amount</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-textMain/80 text-sm">Payout if triggered</span>
              <span className="text-2xl font-mono font-bold text-white">{formData.coverage} STT</span>
            </div>
            <input type="range" min="0.001" max="0.01" step="0.001" name="coverage" value={formData.coverage} onChange={handleInputChange}
              className="w-full accent-primary h-2 bg-white/10 rounded-lg appearance-none cursor-pointer" />
            <div className="flex justify-between text-xs text-textMain/50 font-mono">
              <span>0.001 STT</span>
              <span>0.01 STT</span>
            </div>
          </div>
        </div>

        {/* Threshold */}
        <div className="space-y-4">
          <h3 className="text-xl font-heading text-primary border-b border-white/5 pb-2">Rainfall Threshold</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {thresholdOptions.map(opt => (
              <label key={opt.value} className={`relative flex cursor-pointer rounded-lg border bg-black/20 p-4 shadow-sm focus:outline-none transition-all ${formData.threshold === opt.value ? 'border-primary ring-1 ring-primary/50' : 'border-white/10 hover:border-white/20'}`}>
                <input type="radio" name="threshold" value={opt.value} checked={formData.threshold === opt.value} onChange={handleInputChange} className="sr-only" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white">{opt.label}</span>
                  <span className="text-xs text-textMain/60 mt-1">{opt.desc}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Premium & Submit */}
        <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-sm text-textMain/60 mb-1">Required Premium</p>
            <p className="text-3xl font-mono font-bold text-secondary">{premium} <span className="text-lg text-textMain/50">STT</span></p>
          </div>
          <button type="submit" disabled={loading} className="w-full md:w-auto btn-primary px-8 py-3 flex items-center justify-center gap-2">
            {loading ? (
              <><span className="animate-spin border-2 border-black border-t-transparent rounded-full w-5 h-5"></span> Processing...</>
            ) : "Create Policy"}
          </button>
        </div>

        {/* Toasts */}
        {statusMsg.msg && (
          <div className={`mt-4 p-4 rounded-lg text-sm border ${statusMsg.type === 'error' ? 'bg-danger/10 border-danger/20 text-danger' : statusMsg.type === 'success' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-white/5 border-white/10 text-white'}`}>
            {statusMsg.msg}
          </div>
        )}
      </form>
    </div>
  );
}
