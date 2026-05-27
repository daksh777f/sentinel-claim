import { useState, useEffect, useCallback } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import { CONTRACT_ADDRESS, REACTOR_ADDRESS, SENTINEL_ABI, REACTOR_ABI } from '../utils/contracts';

const SOMNIA_TESTNET_CHAIN_ID = 50312n; // 0xc488

export function useContract() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [reactor, setReactor] = useState(null);
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isCorrectChain, setIsCorrectChain] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  const checkNetwork = async (currentProvider) => {
    if (!currentProvider) return;
    const network = await currentProvider.getNetwork();
    setChainId(network.chainId);
    setIsCorrectChain(network.chainId === SOMNIA_TESTNET_CHAIN_ID);
  };

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const browserProvider = new BrowserProvider(window.ethereum);
        const accounts = await browserProvider.send("eth_requestAccounts", []);
        const currentAccount = accounts[0];
        
        const currentSigner = await browserProvider.getSigner();
        const currentContract = new Contract(CONTRACT_ADDRESS, SENTINEL_ABI, currentSigner);
        const currentReactor = new Contract(REACTOR_ADDRESS, REACTOR_ABI, currentSigner);

        setProvider(browserProvider);
        setSigner(currentSigner);
        setAccount(currentAccount);
        setContract(currentContract);
        setReactor(currentReactor);
        setIsConnected(true);
        
        await checkNetwork(browserProvider);
      } catch (error) {
        console.error("Failed to connect wallet:", error);
      }
    } else {
      console.error("MetaMask is not installed");
    }
  };

  const switchToSomnia = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xc488' }], // 50312 in hex
        });
      } catch (switchError) {
        // This error code indicates that the chain has not been added to MetaMask.
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: '0xc488',
                  chainName: 'Somnia Testnet',
                  rpcUrls: ['https://api.infra.testnet.somnia.network/'],
                  nativeCurrency: {
                    name: 'STT',
                    symbol: 'STT',
                    decimals: 18,
                  },
                },
              ],
            });
          } catch (addError) {
            console.error("Failed to add Somnia Testnet:", addError);
          }
        } else {
          console.error("Failed to switch network:", switchError);
        }
      }
    }
  };

  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          setIsConnected(false);
          setAccount(null);
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
      
      // Attempt silent connection
      if (window.ethereum.selectedAddress) {
        connectWallet();
      }
    }
    
    return () => {
      if (typeof window.ethereum !== 'undefined') {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  return {
    provider,
    signer,
    contract,
    reactor,
    account,
    chainId,
    isCorrectChain,
    isConnected,
    connectWallet,
    switchToSomnia,
  };
}
