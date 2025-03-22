'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { getPublicFundingContract } from '@/lib/publicFundingContract';

interface AdminPanelProps {
  showNotification: (message: string) => void;
  onError: (message: string) => void;
}

export function AdminPanel({ showNotification, onError }: AdminPanelProps) {
  const [newAuthorityAddress, setNewAuthorityAddress] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const addAuthority = async () => {
    try {
      if (!ethers.isAddress(newAuthorityAddress)) {
        throw new Error("Invalid Ethereum address");
      }

      const contract = await getPublicFundingContract();
      const tx = await contract.addAuthority(newAuthorityAddress);
      await tx.wait();

      showNotification(`Successfully added authority: ${newAuthorityAddress}`);
      setNewAuthorityAddress('');
    } catch (err) {
      console.error("Error adding authority:", err);
      onError("Failed to add authority. " + (err as Error).message);
    }
  };

  const depositFunds = async () => {
    try {
      const amount = ethers.parseEther(depositAmount);
      const contract = await getPublicFundingContract();
      const tx = await contract.depositFunds({ value: amount });
      await tx.wait();

      showNotification(`Successfully deposited ${depositAmount} ETH`);
      setDepositAmount('');
    } catch (err) {
      console.error("Error depositing funds:", err);
      onError("Failed to deposit funds. " + (err as Error).message);
    }
  };

  const withdrawFunds = async () => {
    try {
      const amount = ethers.parseEther(withdrawAmount);
      const contract = await getPublicFundingContract();
      const tx = await contract.withdrawFunds(amount);
      await tx.wait();

      showNotification(`Successfully withdrawn ${withdrawAmount} ETH`);
      setWithdrawAmount('');
    } catch (err) {
      console.error("Error withdrawing funds:", err);
      onError("Failed to withdraw funds. " + (err as Error).message);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Admin Panel</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4">Manage Authorities</h3>

          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Add New Authority</label>
            <div className="flex">
              <input
                type="text"
                value={newAuthorityAddress}
                onChange={(e) => setNewAuthorityAddress(e.target.value)}
                placeholder="Ethereum address"
                className="flex-1 p-2 border rounded-l"
              />
              <button
                onClick={addAuthority}
                className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600"
              >
                Add
              </button>
            </div>
          </div>

          <p className="text-sm text-gray-600">
            Note: Authority list is not available from the contract directly.
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4">Manage Funds</h3>

          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Deposit Funds</label>
            <div className="flex">
              <input
                type="number"
                step="0.01"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="Amount in ETH"
                className="flex-1 p-2 border rounded-l"
              />
              <button
                onClick={depositFunds}
                className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600"
              >
                Deposit
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Withdraw Funds</label>
            <div className="flex">
              <input
                type="number"
                step="0.01"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Amount in ETH"
                className="flex-1 p-2 border rounded-l"
              />
              <button
                onClick={withdrawFunds}
                className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600"
              >
                Withdraw
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}