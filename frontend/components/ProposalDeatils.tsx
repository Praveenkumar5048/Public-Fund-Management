'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getPublicFundingContract } from '@/lib/publicFundingContract';
import { ethers } from 'ethers';

// Define types based on the smart contract structure
enum ProposalState {
  Created,
  UnderAuthorityVoting,
  PublicVoting,
  Approved,
  Rejected,
  InProgress,
  Completed
}

enum StageState {
  NotStarted,
  InProgress,
  Completed
}

interface StageInfo {
  amount: bigint;
  report: string;
  voteCount: bigint;
  state: StageState;
}

interface ProposalInfo {
  description: string;
  recipient: string;
  totalAmount: bigint;
  state: ProposalState;
  publicYesVotes: bigint;
  publicNoVotes: bigint;
  currentStage: bigint;
  totalStages: bigint;
  authorityYesVotes: bigint;
  authorityNoVotes: bigint;
  publicVotingEndTime: bigint;
}

export default function ProposalDetailsPage() {
  const params = useParams();
  const proposalId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<ProposalInfo | null>(null);
  const [stages, setStages] = useState<StageInfo[]>([]);
  const [userComment, setUserComment] = useState('');
  const [userVote, setUserVote] = useState<boolean | null>(null);
  const [isAuthority, setIsAuthority] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [contractBalance, setContractBalance] = useState<bigint>(BigInt(0));

  
  
  // Helper function to convert proposal state to string
  const getProposalStateText = (state: ProposalState): string => {
    const states = [
      'Created',
      'Authority Voting',
      'Public Voting',
      'Approved',
      'Rejected',
      'In Progress',
      'Completed'
    ];
    return states[state];
  };
  
  // Helper function to convert stage state to string
  const getStageStateText = (state: StageState): string => {
    const states = ['Not Started', 'In Progress', 'Completed'];
    return states[state];
  };
  
  // Format timestamp to readable date
  const formatTimestamp = (timestamp: bigint): string => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString();
  };
  
  // Format amount from wei to ETH
  const formatAmount = (amount: bigint): string => {
    return ethers.formatEther(amount);
  };

  // Convert address to shorter format
  const shortenAddress = (address: string): string => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  // Calculate progress percentages for voting
  const calculateProgress = (yes: bigint, no: bigint): number => {
    const total = yes + no;
    if (total === BigInt(0)) return 0;
    return Number((yes * BigInt(100)) / total);
  };
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const contract = await getPublicFundingContract();
        if (!contract) {
          throw new Error("Failed to load contract");
        }
        
        // Get user's address
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        const currentAddress = accounts[0];
        setUserAddress(currentAddress);
        
        // Check if user is admin or authority
        const adminAddress = await contract.admin();
        setIsAdmin(currentAddress.toLowerCase() === adminAddress.toLowerCase());
        
        const isAuthorityResult = await contract.authorities(currentAddress);
        setIsAuthority(isAuthorityResult);
        
        // Get contract balance
        const balance = await contract.getContractBalance();
        setContractBalance(balance);
        
        // Get proposal details
        const proposalInfo = await contract.getProposalInfo(proposalId);
        setProposal(proposalInfo);
        
        // Get stage details
        const stagesData: StageInfo[] = [];
        for (let i = 0; i < Number(proposalInfo.totalStages); i++) {
          const stageInfo = await contract.getStageInfo(proposalId, i);
          stagesData.push(stageInfo);
        }
        setStages(stagesData);
        
      } catch (err) {
        console.error("Error fetching proposal details:", err);
        setError("Failed to load proposal details. Please check your connection and try again.");
      } finally {
        setLoading(false);
      }
    };
    
    if (proposalId) {
      fetchData();
    }
  }, [proposalId]);
  
  // Handle public voting
  const handlePublicVote = async () => {
    if (!userVote || !proposal || proposal.state !== ProposalState.PublicVoting) return;
    
    try {
      const contract = await getPublicFundingContract();
      if (!contract) throw new Error("Failed to load contract");
      
      const tx = await contract.publicVoteOnProposal(proposalId, userVote, userComment);
      await tx.wait();
      
      // Refresh proposal data
      const updatedProposal = await contract.getProposalInfo(proposalId);
      setProposal(updatedProposal);
      
      alert("Your vote has been recorded!");
      setUserComment('');
    } catch (err) {
      console.error("Error voting:", err);
      alert("Failed to submit your vote. Please try again.");
    }
  };
  
  // Handle authority voting on proposal
  const handleAuthorityVote = async (vote: boolean) => {
    if (!proposal || proposal.state !== ProposalState.UnderAuthorityVoting) return;
    
    try {
      const contract = await getPublicFundingContract();
      if (!contract) throw new Error("Failed to load contract");
      
      const tx = await contract.authorityVoteOnProposal(proposalId, vote);
      await tx.wait();
      
      // Refresh proposal data
      const updatedProposal = await contract.getProposalInfo(proposalId);
      setProposal(updatedProposal);
      
      alert("Your authority vote has been recorded!");
    } catch (err) {
      console.error("Error voting as authority:", err);
      alert("Failed to submit your authority vote. Please try again.");
    }
  };
  
  // Handle authority voting on stage
  const handleStageVote = async (stageNumber: number, approve: boolean) => {
    try {
      const contract = await getPublicFundingContract();
      if (!contract) throw new Error("Failed to load contract");
      
      const tx = await contract.voteOnStage(proposalId, stageNumber, approve);
      await tx.wait();
      
      // Refresh stage data
      const updatedStageInfo = await contract.getStageInfo(proposalId, stageNumber);
      const newStages = [...stages];
      newStages[stageNumber] = updatedStageInfo;
      setStages(newStages);
      
      alert("Your stage vote has been recorded!");
    } catch (err) {
      console.error("Error voting on stage:", err);
      alert("Failed to submit your stage vote. Please try again.");
    }
  };
  
  // Close public voting (admin only)
  const handleClosePublicVoting = async () => {
    if (!proposal || proposal.state !== ProposalState.PublicVoting) return;
    
    try {
      const contract = await getPublicFundingContract();
      if (!contract) throw new Error("Failed to load contract");
      
      const tx = await contract.closePublicVoting(proposalId);
      await tx.wait();
      
      // Refresh proposal data
      const updatedProposal = await contract.getProposalInfo(proposalId);
      setProposal(updatedProposal);
      
      alert("Public voting has been closed!");
    } catch (err) {
      console.error("Error closing voting:", err);
      alert("Failed to close public voting. Please try again.");
    }
  };
  
  // Release stage funds (admin only)
  const handleReleaseStageAmount = async () => {
    try {
      const contract = await getPublicFundingContract();
      if (!contract) throw new Error("Failed to load contract");
      
      const tx = await contract.releaseStageAmount(proposalId);
      await tx.wait();
      for (let i = 0; i < Number(proposal?.totalStages || 0); i++) {
        const stageInfo = await contract.getStageInfo(proposalId, i);
        stages[i] = stageInfo;
      }
      setStages([...stages]);
      
      // Refresh proposal data
      const updatedProposal = await contract.getProposalInfo(proposalId);
      setProposal(updatedProposal);
      
      // Get updated contract balance
      const balance = await contract.getContractBalance();
      setContractBalance(balance);
      
      alert("Stage funds have been released!");
    } catch (err) {
      console.error("Error releasing funds:", err);
      alert("Failed to release stage funds. Please try again.");
    }
  };
  
  // Submit stage report (recipient only)
  const handleSubmitStageReport = async (stageNumber: number, report: string) => {
    try {
      const contract = await getPublicFundingContract();
      if (!contract) throw new Error("Failed to load contract");
      
      const tx = await contract.submitStageReport(proposalId, stageNumber, report);
      await tx.wait();
      
      // Refresh stage data
      const updatedStageInfo = await contract.getStageInfo(proposalId, stageNumber);
      const newStages = [...stages];
      newStages[stageNumber] = updatedStageInfo;
      setStages(newStages);
      
      alert("Your report has been submitted!");
    } catch (err) {
      console.error("Error submitting report:", err);
      alert("Failed to submit your report. Please try again.");
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded" role="alert">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }
  
  if (!proposal) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded" role="alert">
          <p className="font-bold">Not Found</p>
          <p>The requested proposal could not be found.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Proposal #{proposalId}</h1>
        <div className="flex items-center">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            proposal.state === ProposalState.Approved || proposal.state === ProposalState.Completed || proposal.state === ProposalState.InProgress 
              ? 'bg-green-100 text-green-800' 
              : proposal.state === ProposalState.Rejected 
                ? 'bg-red-100 text-red-800' 
                : 'bg-blue-100 text-blue-800'
          }`}>
            {getProposalStateText(proposal.state)}
          </span>
          <span className="ml-4 text-gray-600">
            Contract Balance: {formatAmount(contractBalance)} ETH
          </span>
        </div>
      </div>
      
      {/* Proposal Overview */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600 mb-1">Description</p>
            <p className="font-medium">{proposal.description}</p>
          </div>
          <div>
            <p className="text-gray-600 mb-1">Recipient</p>
            <p className="font-medium">
              {proposal.recipient}
              {userAddress?.toLowerCase() === proposal.recipient.toLowerCase() && (
                <span className="ml-2 bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">You</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-gray-600 mb-1">Total Amount</p>
            <p className="font-medium">{formatAmount(proposal.totalAmount)} ETH</p>
          </div>
          <div>
            <p className="text-gray-600 mb-1">Current Stage</p>
            <p className="font-medium">{Number(proposal.currentStage)} of {Number(proposal.totalStages)}</p>
          </div>
        </div>
      </div>
      
      {/* Authority Voting */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Authority Voting</h2>
        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <span>Yes: {proposal.authorityYesVotes.toString()}</span>
            <span>No: {proposal.authorityNoVotes.toString()}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-green-600 h-2.5 rounded-full" 
              style={{ width: `${calculateProgress(proposal.authorityYesVotes, proposal.authorityNoVotes)}%` }}
            ></div>
          </div>
        </div>
        
        {proposal.state === ProposalState.UnderAuthorityVoting && isAuthority && (
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => handleAuthorityVote(true)}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Vote Yes
            </button>
            <button
              onClick={() => handleAuthorityVote(false)}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Vote No
            </button>
          </div>
        )}
      </div>
      
      {/* Public Voting */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Public Voting</h2>
        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <span>Yes: {proposal.publicYesVotes.toString()}</span>
            <span>No: {proposal.publicNoVotes.toString()}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-green-600 h-2.5 rounded-full" 
              style={{ width: `${calculateProgress(proposal.publicYesVotes, proposal.publicNoVotes)}%` }}
            ></div>
          </div>
        </div>
        
        {proposal.state === ProposalState.PublicVoting && (
          <>
            <div className="mb-4">
              <p className="text-gray-600 mb-1">
                Voting ends: {formatTimestamp(proposal.publicVotingEndTime)}
              </p>
            </div>
            <div className="mt-4">
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Your Comment (Optional)</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  value={userComment}
                  onChange={(e) => setUserComment(e.target.value)}
                ></textarea>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setUserVote(true); }}
                  className={`px-4 py-2 rounded ${userVote === true ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                >
                  Yes
                </button>
                <button
                  onClick={() => { setUserVote(false); }}
                  className={`px-4 py-2 rounded ${userVote === false ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                >
                  No
                </button>
                <button
                  onClick={handlePublicVote}
                  disabled={userVote === null}
                  className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Submit Vote
                </button>
              </div>
            </div>
            
            {isAdmin && (
              <div className="mt-6 pt-4 border-t">
                <button
                  onClick={handleClosePublicVoting}
                  className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                  Close Public Voting
                </button>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Stages */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Stages</h2>
        
        {stages.map((stage, index) => (
          <div key={index} className="mb-6 last:mb-0 border-b last:border-b-0 pb-6 last:pb-0">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-medium">Stage {index + 1}</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                stage.state === StageState.Completed
                  ? 'bg-green-100 text-green-800'
                  : stage.state === StageState.InProgress
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
              }`}>
                {getStageStateText(stage.state)}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-gray-600 mb-1">Amount</p>
                <p className="font-medium">{formatAmount(stage.amount)} ETH</p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Authority Approval</p>
                <p className="font-medium">{stage.voteCount.toString()} votes</p>
              </div>
            </div>
            
            {/* Stage Report */}
            {stage.report ? (
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h4 className="font-medium mb-2">Report</h4>
                <p className="text-gray-800 whitespace-pre-wrap">{stage.report}</p>
              </div>
            ) : (
              stage.state === StageState.InProgress && userAddress?.toLowerCase() === proposal.recipient.toLowerCase() && (
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Submit Report</h4>
                  <textarea
                    id={`report-${index}`}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                    rows={3}
                    placeholder="Enter your report here..."
                  ></textarea>
                  <button
                    onClick={() => {
                      const reportElement = document.getElementById(`report-${index}`) as HTMLTextAreaElement;
                      handleSubmitStageReport(index, reportElement.value);
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Submit Report
                  </button>
                </div>
              )
            )}
            
            {/* Authority Stage Voting */}
            {isAuthority && stage.state === StageState.InProgress && stage.report && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Vote on Report</h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleStageVote(index, true)}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleStageVote(index, false)}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Reject
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        
        {/* Admin Release Stage Controls */}
        {isAdmin && (
          <div className="mt-6 pt-4 border-t">
            {proposal.state === ProposalState.Approved && (
              <button
                onClick={handleReleaseStageAmount}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Release First Stage Funds
              </button>
            )}
            
            {proposal.state === ProposalState.InProgress && Number(proposal.currentStage) < Number(proposal.totalStages) && (
              <button
                onClick={handleReleaseStageAmount}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Release Next Stage Funds
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
