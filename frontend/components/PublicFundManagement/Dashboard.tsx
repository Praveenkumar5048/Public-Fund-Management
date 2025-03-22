'use client';

import { Proposal, ProposalState } from '@/lib/types';
import { useEffect, useState } from 'react';
import { getSBTContract } from '@/lib/sbtTokenContract';

interface DashboardProps {
  address: string;
  proposals: Proposal[];
  contractBalance: string;
}

export function Dashboard({address, proposals, contractBalance }: DashboardProps) {
  const [sbtStats, setSbtStats] = useState({
    userTokenId: null as number | null,
    userHasApplied: false,
    userIsRegistered: false
  });
  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState('');

  useEffect(() => {
    const fetchSBTData = async () => {
      try {
        const sbtContract = await getSBTContract();
        
        // Get user's application status if connected
        let userTokenId = null;
        let userHasApplied = false;
        let userIsRegistered = false;

        if (address) {
          try {
            userIsRegistered = await sbtContract.isRegisteredVoter(address);
            
            if (userIsRegistered) {
              const tokenId = await sbtContract.getTokenIdByAddress(address);
              userTokenId = Number(tokenId);
            } else {
              const status = await sbtContract.getApplicationStatus(address);
              userHasApplied = status.hasApplied;
            }
          } catch (error) {
            console.error("Error fetching user SBT status:", error);
          }
        }
        
        setSbtStats({
          userTokenId,
          userHasApplied,
          userIsRegistered
        });
      } catch (error) {
        console.error("Error fetching SBT data:", error);
      }
    };
    
    fetchSBTData();
  }, [address]);

  const handleApplyForSBT = async () => {
    if (!address) return;
    
    try {
      setIsApplying(true);
      setApplyError('');
      
      const sbtContract = await getSBTContract();
      
      // Generate a simple voter hash from the address
      // In a real application, you might want a more secure or specific hash generation
      const voterHash = '0x' + Array.from(address)
        .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('').slice(0, 64);
        
      // Call the apply method on the contract
      const tx = await sbtContract.applyForSBT('0x' + voterHash.slice(2).padEnd(64, '0'));
      await tx.wait();
      
      // Refresh the user's status
      const status = await sbtContract.getApplicationStatus(address);
      setSbtStats(prev => ({
        ...prev,
        userHasApplied: status.hasApplied
      }));
      
    } catch (error) {
      console.error("Error applying for SBT:", error);
      setApplyError('Failed to apply. Please try again.');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">System Overview</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Contract Balance</h3>
          <p className="text-3xl font-bold">{contractBalance} ETH</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Total Proposals</h3>
          <p className="text-3xl font-bold">{proposals.length}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Active Proposals</h3>
          <p className="text-3xl font-bold">
            {proposals.filter(p =>
              p.state !== 'Rejected' && p.state !== 'Completed'
            ).length}
          </p>
        </div>
      </div>

      {/* SBT Token Status Section */}
      <h2 className="text-2xl font-semibold mb-4">SBT Token Status</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Your Status</h3>
          {address ? (
            <div>
              {sbtStats.userIsRegistered ? (
                <div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    Registered Voter
                  </span>
                  <p className="mt-2">Token ID: {sbtStats.userTokenId}</p>
                </div>
              ) : sbtStats.userHasApplied ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                  Application Pending
                </span>
              ) : (
                <div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 mb-3">
                    Not Applied
                  </span>
                  <button 
                    onClick={handleApplyForSBT}
                    disabled={isApplying}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
                  >
                    {isApplying ? 'Applying...' : 'Apply for SBT Token'}
                  </button>
                  {applyError && (
                    <p className="mt-2 text-sm text-red-600">{applyError}</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500">Connect wallet to view status</p>
          )}
        </div>
      </div>

      <h3 className="text-xl font-semibold mb-4">Proposal Status Summary</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-2 px-4 border">Status</th>
              <th className="py-2 px-4 border">Count</th>
            </tr>
          </thead>
          <tbody>
            {(['Created', 'UnderAuthorityVoting', 'PublicVoting', 'Approved', 'InProgress', 'Rejected', 'Completed'] as ProposalState[]).map(state => (
              <tr key={state}>
                <td className="py-2 px-4 border">{state}</td>
                <td className="py-2 px-4 border text-center">
                  {proposals.filter(p => p.state === state).length}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}