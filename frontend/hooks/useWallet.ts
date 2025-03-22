'use client';

import { useState, useEffect } from 'react';
import { getPublicFundingContract } from '@/lib/publicFundingContract';

export function useWallet() {
  const [account, setAccount] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthority, setIsAuthority] = useState(false);

  useEffect(() => {
    const connectWallet = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          setAccount(accounts[0]);
          await checkRoles(accounts[0]);
        } catch (err) {
          console.error("Error connecting to wallet:", err);
        }
      }
    };

    connectWallet();

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        setAccount(accounts[0]);
        checkRoles(accounts[0]);
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners();
      }
    };
  }, []);

  const checkRoles = async (address: string) => {
    try {
      const contract = await getPublicFundingContract();
      const adminAddress = await contract.admin();
      const isAuth = await contract.authorities(address);

      setIsAdmin(adminAddress.toLowerCase() === address.toLowerCase());
      setIsAuthority(isAuth);
    } catch (err) {
      console.error("Error checking roles:", err);
    }
  };

  return { account, isAdmin, isAuthority };
}