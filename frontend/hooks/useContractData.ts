'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { getPublicFundingContract } from '@/lib/publicFundingContract';

export function useContractData() {
  const [contractBalance, setContractBalance] = useState('0');

  const loadContractData = async () => {
    try {
      const contract = await getPublicFundingContract();
      const balance = await contract.getContractBalance();
      setContractBalance(ethers.formatEther(balance));
    } catch (err) {
      console.error("Error loading contract data:", err);
    }
  };

  return { contractBalance, loadContractData };
}