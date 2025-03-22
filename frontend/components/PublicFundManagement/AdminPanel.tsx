'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getPublicFundingContract } from '@/lib/publicFundingContract';
import { getSBTContract } from '@/lib/sbtTokenContract';

interface AdminPanelProps {
  showNotification: (message: string) => void;
  onError: (message: string) => void;
}

interface PendingApplication {
  address: string;
  applicationHash: string;
}

export function AdminPanel({ showNotification, onError }: AdminPanelProps) {
  const [newAuthorityAddress, setNewAuthorityAddress] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [pendingApplications, setPendingApplications] = useState<PendingApplication[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [processingApproval, setProcessingApproval] = useState<string | null>(null);

  // Fetch pending applications
  const fetchPendingApplications = async () => {
    try {
      setLoadingApplications(true);
      const sbtContract = await getSBTContract();
      
      // Get applicant count
      const applicantCount = await sbtContract.getApplicantCount();
      const count = Number(applicantCount);
      
      const applications: PendingApplication[] = [];
      
      // Fetch each applicant
      for (let i = 0; i < count; i++) {
        try {
          const applicantAddress = await sbtContract.getApplicantByIndex(i);
          const applicationHash = await sbtContract.applications(applicantAddress);
          
          if (applicationHash !== ethers.ZeroHash) {
            applications.push({
              address: applicantAddress,
              applicationHash: applicationHash
            });
          }
        } catch (err) {
          console.error(`Error fetching applicant at index ${i}:`, err);
        }
      }
      
      setPendingApplications(applications);
    } catch (err) {
      console.error("Error fetching pending applications:", err);
      onError("Failed to load pending applications");
    } finally {
      setLoadingApplications(false);
    }
  };

  useEffect(() => {
    fetchPendingApplications();
  }, []);

  const approveApplication = async (applicantAddress: string) => {
    try {
      setProcessingApproval(applicantAddress);
      
      // Generate a random nullifier (in a real application, this would be more complex)
      const nullifier = Math.floor(Math.random() * 1000000);
      
      const sbtContract = await getSBTContract();
      const tx = await sbtContract.approveApplication(applicantAddress, nullifier);
      await tx.wait();
      
      showNotification(`Successfully approved application for ${applicantAddress}`);
      
      // Refresh the applications list
      fetchPendingApplications();
    } catch (err) {
      console.error("Error approving application:", err);
      onError("Failed to approve application. " + (err as Error).message);
    } finally {
      setProcessingApproval(null);
    }
  };

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

  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Admin Panel</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
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

      {/* SBT Applications Section */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Pending SBT Applications</h3>
          <button 
            onClick={fetchPendingApplications}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {loadingApplications ? (
          <div className="text-center py-6">
            <div className="spinner-border text-blue-500" role="status">
              <span className="sr-only">Loading...</span>
            </div>
            <p className="mt-2">Loading applications...</p>
          </div>
        ) : pendingApplications.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            No pending applications found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-4 text-left">Applicant</th>
                  <th className="py-2 px-4 text-left">Application Hash</th>
                  <th className="py-2 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingApplications.map((application) => (
                  <tr key={application.address} className="border-t">
                    <td className="py-3 px-4">
                      <span className="font-mono">{formatAddress(application.address)}</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(application.address)}
                        className="ml-2 text-blue-500 hover:text-blue-700"
                        title="Copy full address"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </td>
                    <td className="py-3 px-4 font-mono text-sm truncate max-w-xs">
                      {formatAddress(application.applicationHash)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => approveApplication(application.address)}
                        disabled={processingApproval === application.address}
                        className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-green-300"
                      >
                        {processingApproval === application.address ? 'Processing...' : 'Approve'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}