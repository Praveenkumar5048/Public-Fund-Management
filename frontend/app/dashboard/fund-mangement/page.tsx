'use client';

import { useState, useEffect } from 'react';
import { getPublicFundingContract } from '@/lib/publicFundingContract';
import { ethers } from 'ethers';

// Define types based on your contract
type ProposalState = 'Created' | 'UnderAuthorityVoting' | 'PublicVoting' | 'Approved' | 'Rejected' | 'InProgress' | 'Completed';
type StageState = 'NotStarted' | 'InProgress' | 'Completed';

interface Proposal {
  id: number;
  description: string;
  recipient: string;
  totalAmount: string;
  authorityYesVotes: number;
  authorityNoVotes: number;
  publicYesVotes: number;
  publicNoVotes: number;
  state: ProposalState;
  publicVotingEndTime: number;
  currentStage: number;
  totalStages: number;
}

interface Stage {
  amount: string;
  report: string;
  voteCount: number;
  state: StageState;
}

export default function PublicFundManagement() {
  // State variables
  const [account, setAccount] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthority, setIsAuthority] = useState(false);
  const [contractBalance, setContractBalance] = useState('0');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState('');

  // Form states
  const [newAuthorityAddress, setNewAuthorityAddress] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  // Proposal form states
  const [proposalDescription, setProposalDescription] = useState('');
  const [proposalRecipient, setProposalRecipient] = useState('');
  const [proposalTotalAmount, setProposalTotalAmount] = useState('');
  const [stageAmounts, setStageAmounts] = useState<string[]>(['', '', '']);
  const [stageCount, setStageCount] = useState(3);

  // Vote form states
  const [publicVoteComment, setPublicVoteComment] = useState('');
  const [stageReport, setStageReport] = useState('');
  const [selectedProposalForReport, setSelectedProposalForReport] = useState<number | null>(null);
  const [selectedStageForReport, setSelectedStageForReport] = useState<number | null>(null);

  // Connect to wallet and contract
  useEffect(() => {
    const connectWallet = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          setAccount(accounts[0]);

          await checkRoles(accounts[0]);
          await loadContractData();
        } catch (err) {
          console.error("Error connecting to wallet:", err);
          setError("Failed to connect to wallet. Please make sure MetaMask is installed and unlocked.");
        }
      } else {
        setError("Please install MetaMask to use this application.");
      }
    };

    connectWallet();

    // Listen for account changes
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

  // Check if user is admin or authority
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

  // Load all contract data
  const loadContractData = async () => {
    setLoading(true);
    try {
      const contract = await getPublicFundingContract();

      // Get contract balance
      const balance = await contract.getContractBalance();
      setContractBalance(ethers.formatEther(balance));

      // Get proposal count
      const proposalCount = await contract.proposalCount();

      // Load all proposals
      const proposalsData: Proposal[] = [];
      for (let i = 0; i < proposalCount; i++) {
        const proposalInfo = await contract.getProposalInfo(i);
        console.log("proposalInfo",proposalInfo);
        const proposal: Proposal = {
          id: i,
          description: proposalInfo[0], // String
          recipient: proposalInfo[1], // Address
          totalAmount: ethers.formatEther(proposalInfo[2]), // Convert BigInt to Ether
          state: mapStateToString(Number(proposalInfo[3])),
          publicYesVotes: Number(proposalInfo[4]),
          publicNoVotes: Number(proposalInfo[5]),
          currentStage: Number(proposalInfo[6]),
          totalStages: Number(proposalInfo[7]),
          authorityYesVotes: Number(proposalInfo[8]),
          authorityNoVotes: Number(proposalInfo[9]),
          publicVotingEndTime: Number(proposalInfo[10]),
        };

        proposalsData.push(proposal);
      }
      setProposals(proposalsData);
    } catch (err) {
      console.error("Error loading contract data:", err);
      setError("Failed to load contract data. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // Map numeric state to string
  const mapStateToString = (state: number): ProposalState => {
    const states: ProposalState[] = [
      'Created', 'UnderAuthorityVoting', 'PublicVoting',
      'Approved', 'Rejected', 'InProgress', 'Completed'
    ];
    return states[state];
  };

  // Map numeric stage state to string
  const mapStageStateToString = (state: number): StageState => {
    const states: StageState[] = ['NotStarted', 'InProgress', 'Completed'];
    return states[state];
  };

  // Notification handler
  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 5000);
  };

  // Contract interaction functions
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
      await loadContractData();
    } catch (err) {
      console.error("Error adding authority:", err);
      setError("Failed to add authority. " + (err as Error).message);
    }
  };

  const removeAuthority = async (authorityAddress: string) => {
    try {
      const contract = await getPublicFundingContract();
      const tx = await contract.removeAuthority(authorityAddress);
      await tx.wait();

      showNotification(`Successfully removed authority: ${authorityAddress}`);
      await loadContractData();
    } catch (err) {
      console.error("Error removing authority:", err);
      setError("Failed to remove authority. " + (err as Error).message);
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
      await loadContractData();
    } catch (err) {
      console.error("Error depositing funds:", err);
      setError("Failed to deposit funds. " + (err as Error).message);
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
      await loadContractData();
    } catch (err) {
      console.error("Error withdrawing funds:", err);
      setError("Failed to withdraw funds. " + (err as Error).message);
    }
  };

  const createProposal = async () => {
    try {
      // Validate inputs
      if (!proposalDescription || !proposalRecipient || !proposalTotalAmount) {
        throw new Error("Please fill all required fields");
      }

      if (!ethers.isAddress(proposalRecipient)) {
        throw new Error("Invalid recipient address");
      }

      // Filter out empty stage amounts and convert to wei
      const filteredStageAmounts = stageAmounts
        .slice(0, stageCount)
        .filter(amount => !!amount);

      if (filteredStageAmounts.length === 0) {
        throw new Error("At least one stage amount is required");
      }

      const totalAmount = ethers.parseEther(proposalTotalAmount);
      const stageAmountsInWei = filteredStageAmounts.map(amount =>
        ethers.parseEther(amount)
      );

      const contract = await getPublicFundingContract();
      const tx = await contract.createProposal(
        proposalDescription,
        proposalRecipient,
        totalAmount,
        stageAmountsInWei
      );
      await tx.wait();

      showNotification("Proposal created successfully!");

      // Reset form
      setProposalDescription('');
      setProposalRecipient('');
      setProposalTotalAmount('');
      setStageAmounts(['', '', '']);
      setStageCount(3);

      await loadContractData();
    } catch (err) {
      console.error("Error creating proposal:", err);
      setError("Failed to create proposal. " + (err as Error).message);
    }
  };

  const authorityVote = async (proposalId: number, vote: boolean) => {
    try {
      const contract = await getPublicFundingContract();
      const tx = await contract.authorityVoteOnProposal(proposalId, vote);
      await tx.wait();

      showNotification(`Vote recorded for proposal #${proposalId}`);
      await loadContractData();
    } catch (err) {
      console.error("Error voting on proposal:", err);
      setError("Failed to vote. " + (err as Error).message);
    }
  };

  const publicVote = async (proposalId: number, vote: boolean) => {
    try {
      const contract = await getPublicFundingContract();
      const tx = await contract.publicVoteOnProposal(proposalId, vote, publicVoteComment);
      await tx.wait();

      showNotification(`Public vote recorded for proposal #${proposalId}`);
      setPublicVoteComment('');
      await loadContractData();
    } catch (err) {
      console.error("Error public voting on proposal:", err);
      setError("Failed to vote. " + (err as Error).message);
    }
  };

  const closePublicVoting = async (proposalId: number) => {
    try {
      const contract = await getPublicFundingContract();
      const tx = await contract.closePublicVoting(proposalId);
      await tx.wait();

      showNotification(`Public voting closed for proposal #${proposalId}`);
      await loadContractData();
    } catch (err) {
      console.error("Error closing public voting:", err);
      setError("Failed to close voting. " + (err as Error).message);
    }
  };

  const releaseStageAmount = async (proposalId: number) => {
    try {
      const contract = await getPublicFundingContract();
      const tx = await contract.releaseStageAmount(proposalId);
      await tx.wait();

      showNotification(`Stage funds released for proposal #${proposalId}`);
      await loadContractData();
    } catch (err) {
      console.error("Error releasing stage amount:", err);
      setError("Failed to release funds. " + (err as Error).message);
    }
  };

  const submitReport = async () => {
    try {
      if (selectedProposalForReport === null || selectedStageForReport === null) {
        throw new Error("Please select a proposal and stage");
      }

      if (!stageReport) {
        throw new Error("Report cannot be empty");
      }

      const contract = await getPublicFundingContract();
      const tx = await contract.submitStageReport(
        selectedProposalForReport,
        selectedStageForReport,
        stageReport
      );
      await tx.wait();

      showNotification(`Report submitted for proposal #${selectedProposalForReport} stage #${selectedStageForReport}`);
      setStageReport('');
      setSelectedProposalForReport(null);
      setSelectedStageForReport(null);
      await loadContractData();
    } catch (err) {
      console.error("Error submitting report:", err);
      setError("Failed to submit report. " + (err as Error).message);
    }
  };

  const voteOnStage = async (proposalId: number, stageNumber: number, approve: boolean) => {
    try {
      const contract = await getPublicFundingContract();
      const tx = await contract.voteOnStage(proposalId, stageNumber, approve);
      await tx.wait();

      showNotification(`Vote recorded for proposal #${proposalId} stage #${stageNumber}`);
      await loadContractData();
    } catch (err) {
      console.error("Error voting on stage:", err);
      setError("Failed to vote on stage. " + (err as Error).message);
    }
  };

  const getStageInfo = async (proposalId: number, stageNumber: number) => {
    try {
      const contract = await getPublicFundingContract();
      const stageInfo = await contract.getStageInfo(proposalId, stageNumber);

      return {
        amount: ethers.formatEther(stageInfo.amount),
        report: stageInfo.report,
        voteCount: stageInfo.voteCount.toNumber(),
        state: mapStageStateToString(stageInfo.state)
      };
    } catch (err) {
      console.error("Error getting stage info:", err);
      setError("Failed to get stage info. " + (err as Error).message);
      return null;
    }
  };

  // Handle stage amount inputs
  const updateStageAmount = (index: number, value: string) => {
    const newStageAmounts = [...stageAmounts];
    newStageAmounts[index] = value;
    setStageAmounts(newStageAmounts);
  };

  // Check if total of stage amounts equals total amount
  const validateStageAmounts = () => {
    const total = stageAmounts
      .slice(0, stageCount)
      .filter(amount => !!amount)
      .reduce((sum, amount) => sum + parseFloat(amount || '0'), 0);

    return Math.abs(total - parseFloat(proposalTotalAmount || '0')) < 0.0001;
  };

  // UI Rendering
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg">Loading Public Fund Management System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Public Fund Management</h1>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-gray-600">Contract Balance: <span className="font-bold">{contractBalance} ETH</span></p>
            <p className="text-gray-600">Connected Account: <span className="font-mono">{account || 'Not connected'}</span></p>
            <p className="text-gray-600">
              Role: <span className="font-bold">
                {isAdmin ? 'Admin' : isAuthority ? 'Authority' : 'Public User'}
              </span>
            </p>
          </div>
          <button
            onClick={() => loadContractData()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            Refresh Data
          </button>
        </div>
      </header>

      {/* Notification */}
      {notification && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          {notification}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <div className="flex justify-between">
            <p>{error}</p>
            <button onClick={() => setError('')} className="font-bold">×</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b">
        <nav className="flex flex-wrap -mb-px">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`mr-2 py-2 px-4 ${activeTab === 'dashboard' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
          >
            Dashboard
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`mr-2 py-2 px-4 ${activeTab === 'admin' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
            >
              Admin Panel
            </button>
          )}
          {isAuthority && (
            <button
              onClick={() => setActiveTab('authority')}
              className={`mr-2 py-2 px-4 ${activeTab === 'authority' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
            >
              Authority Panel
            </button>
          )}
          <button
            onClick={() => setActiveTab('proposals')}
            className={`mr-2 py-2 px-4 ${activeTab === 'proposals' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
          >
            Proposals
          </button>
          {proposals.some(p => p.state === 'PublicVoting') && (
            <button
              onClick={() => setActiveTab('voting')}
              className={`mr-2 py-2 px-4 ${activeTab === 'voting' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
            >
              Public Voting
            </button>
          )}
          {proposals.some(p => p.state === 'InProgress') && (
            <button
              onClick={() => setActiveTab('reports')}
              className={`mr-2 py-2 px-4 ${activeTab === 'reports' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
            >
              Stage Reports
            </button>
          )}
        </nav>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
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
      )}

      {/* Admin Panel Tab */}
      {activeTab === 'admin' && isAdmin && (
        <div>
          <h2 className="text-2xl font-semibold mb-6">Admin Panel</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Manage Authorities */}
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

              {/* List of authorities would be displayed here if we had a function to get them */}
              <p className="text-sm text-gray-600">
                Note: Authority list is not available from the contract directly.
              </p>
            </div>

            {/* Manage Funds */}
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
      )}

      {/* Authority Panel Tab */}
      {activeTab === 'authority' && isAuthority && (
        <div>
          <h2 className="text-2xl font-semibold mb-6">Authority Panel</h2>

          {/* Create Proposal Form */}
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h3 className="text-xl font-semibold mb-4">Create New Proposal</h3>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-gray-700 mb-2">Description</label>
                <textarea
                  value={proposalDescription}
                  onChange={(e) => setProposalDescription(e.target.value)}
                  className="w-full p-2 border rounded"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Recipient Address</label>
                <input
                  type="text"
                  value={proposalRecipient}
                  onChange={(e) => setProposalRecipient(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="0x..."
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Total Amount (ETH)</label>
                <input
                  type="number"
                  step="0.01"
                  value={proposalTotalAmount}
                  onChange={(e) => setProposalTotalAmount(e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Number of Stages</label>
                <select
                  value={stageCount}
                  onChange={(e) => setStageCount(parseInt(e.target.value))}
                  className="w-full p-2 border rounded"
                >
                  <option value={1}>1 Stage</option>
                  <option value={2}>2 Stages</option>
                  <option value={3}>3 Stages</option>
                </select>
              </div>

              {Array.from({ length: stageCount }).map((_, index) => (
                <div key={index}>
                  <label className="block text-gray-700 mb-2">Stage {index + 1} Amount (ETH)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={stageAmounts[index]}
                    onChange={(e) => updateStageAmount(index, e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                </div>
              ))}

              <button
                onClick={createProposal}
                disabled={!validateStageAmounts()}
                className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
              >
                Create Proposal
              </button>

              {!validateStageAmounts() && proposalTotalAmount && (
                <p className="text-red-500 text-sm">
                  Stage amounts must sum to the total amount
                </p>
              )}
            </div>
          </div>

          {/* Authority Voting Section */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-4">Proposals Requiring Authority Vote</h3>

            {proposals
              .filter(p => p.state === 'UnderAuthorityVoting')
              .map(proposal => (
                <div key={proposal.id} className="border-b last:border-b-0 py-4">
                  <h4 className="font-semibold mb-2">Proposal #{proposal.id}</h4>
                  <p className="mb-2">{proposal.description}</p>
                  <p className="text-gray-600 mb-2">Amount: {proposal.totalAmount} ETH</p>
                  <p className="text-gray-600 mb-2">Yes Votes: {proposal.authorityYesVotes}</p>

                  <div className="flex gap-2">
                    <button
                      onClick={() => authorityVote(proposal.id, true)}
                      className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                    >
                      Vote Yes
                    </button>
                    <button
                      onClick={() => authorityVote(proposal.id, false)}
                      className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                    >
                      Vote No
                    </button>
                  </div>
                </div>
              ))}

            {!proposals.some(p => p.state === 'UnderAuthorityVoting') && (
              <p className="text-gray-600">No proposals currently require authority voting.</p>
            )}

          </div>
        </div>
      )}

      {/* Proposals Tab */}
      {activeTab === 'proposals' && (
        <div>
          <h2 className="text-2xl font-semibold mb-6">All Proposals</h2>

          <div className="space-y-6">
            {proposals.map(proposal => (
              <div key={proposal.id} className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold">Proposal #{proposal.id}</h3>
                  <span className={`px-3 py-1 rounded text-sm ${proposal.state === 'Completed' ? 'bg-green-100 text-green-800' :
                      proposal.state === 'Rejected' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                    }`}>
                    {proposal.state}
                  </span>
                </div>

                <p className="mb-4">{proposal.description}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-gray-600">Recipient</p>
                    <p className="font-mono text-sm">{proposal.recipient}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Amount</p>
                    <p className="font-semibold">{proposal.totalAmount} ETH</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Current Stage</p>
                    <p className="font-semibold">{proposal.currentStage + 1} of {proposal.totalStages}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Votes</p>
                    <p className="font-semibold">
                      Yes: {proposal.publicYesVotes} / No: {proposal.publicNoVotes}
                    </p>
                  </div>
                </div>

                {/* Admin Actions */}
                {isAdmin && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-semibold mb-2">Admin Actions</h4>
                    <div className="flex gap-2">
                      {proposal.state === 'PublicVoting' && (
                        <button
                          onClick={() => closePublicVoting(proposal.id)}
                          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                        >
                          Close Public Voting
                        </button>
                      )}
                      {(proposal.state === 'Approved' || proposal.state === 'InProgress') && (
                        <button
                          onClick={() => releaseStageAmount(proposal.id)}
                          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                        >
                          Release Next Stage
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {proposals.length === 0 && (
              <p className="text-gray-600">No proposals have been created yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Public Voting Tab */}
      {activeTab === 'voting' && (
        <div>
          <h2 className="text-2xl font-semibold mb-6">Public Voting</h2>

          <div className="space-y-6">
            {proposals
              .filter(p => p.state === 'PublicVoting')
              .map(proposal => (
                <div key={proposal.id} className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-xl font-semibold mb-4">Proposal #{proposal.id}</h3>
                  <p className="mb-4">{proposal.description}</p>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-gray-600">Amount Requested</p>
                      <p className="font-semibold">{proposal.totalAmount} ETH</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Current Votes</p>
                      <p className="font-semibold">
                        Yes: {proposal.publicYesVotes} / No: {proposal.publicNoVotes}
                      </p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-gray-700 mb-2">Your Comment</label>
                    <textarea
                      value={publicVoteComment}
                      onChange={(e) => setPublicVoteComment(e.target.value)}
                      className="w-full p-2 border rounded"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => publicVote(proposal.id, true)}
                      className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                    >
                      Vote Yes
                    </button>
                    <button
                      onClick={() => publicVote(proposal.id, false)}
                      className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                    >
                      Vote No
                    </button>
                  </div>
                </div>
              ))}

            {!proposals.some(p => p.state === 'PublicVoting') && (
              <p className="text-gray-600">No proposals are currently open for public voting.</p>
            )}
          </div>
        </div>
      )}

      {/* Stage Reports Tab */}
      {activeTab === 'reports' && (
        <div>
          <h2 className="text-2xl font-semibold mb-6">Stage Reports</h2>

          {/* Submit Report Form */}
          {proposals.some(p => p.state === 'InProgress') && (
            <div className="bg-white p-6 rounded-lg shadow mb-8">
              <h3 className="text-xl font-semibold mb-4">Submit Stage Report</h3>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">Select Proposal</label>
                  <select
                    value={selectedProposalForReport || ''}
                    onChange={(e) => setSelectedProposalForReport(parseInt(e.target.value))}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Choose a proposal...</option>
                    {proposals
                      .filter(p => p.state === 'InProgress')
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          Proposal #{p.id} - Stage {p.currentStage + 1}
                        </option>
                      ))}
                  </select>
                </div>

                {selectedProposalForReport !== null && (
                  <>
                    <div>
                      <label className="block text-gray-700 mb-2">Stage Report</label>
                      <textarea
                        value={stageReport}
                        onChange={(e) => setStageReport(e.target.value)}
                        className="w-full p-2 border rounded"
                        rows={4}
                        placeholder="Describe the progress and use of funds for this stage..."
                      />
                    </div>

                    <button
                      onClick={submitReport}
                      className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
                    >
                      Submit Report
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* List of Reports */}
          <div className="space-y-6">
            {proposals
              .filter(p => p.state === 'InProgress')
              .map(proposal => (
                <div key={proposal.id} className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-xl font-semibold mb-4">
                    Proposal #{proposal.id} - Stage {proposal.currentStage} of {proposal.totalStages}
                  </h3>

                  {/* Stage details would be loaded dynamically */}
                  <p className="text-gray-600 mb-4">
                    Loading stage details...
                  </p>

                  {isAuthority && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => voteOnStage(proposal.id, proposal.currentStage - 1, true)}
                        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                      >
                        Approve Stage
                      </button>
                      <button
                        onClick={() => voteOnStage(proposal.id, proposal.currentStage - 1, false)}
                        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                      >
                        Reject Stage
                      </button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
