'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getPublicFundingContract } from '@/lib/publicFundingContract';
import { Proposal, ProposalState } from '@/lib/types';

interface AuthorityPanelProps {
  showNotification: (message: string) => void;
  onError: (message: string) => void;
}

export function AuthorityPanel({ showNotification, onError }: AuthorityPanelProps) {
  const [proposalDescription, setProposalDescription] = useState('');
  const [proposalRecipient, setProposalRecipient] = useState('');
  const [proposalTotalAmount, setProposalTotalAmount] = useState('');
  const [stageAmounts, setStageAmounts] = useState<string[]>(['', '', '']);
  const [stageCount, setStageCount] = useState(3);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProposals();
  }, []);
  
  const mapStateToString = (state: number): ProposalState => {
    const states: ProposalState[] = [
      'Created', 'UnderAuthorityVoting', 'PublicVoting',
      'Approved', 'Rejected', 'InProgress', 'Completed'
    ];
    return states[state];
  };

  const fetchProposals = async () => {
    try {
      setLoading(true);
      const contract = await getPublicFundingContract();
      const proposalCount = await contract.proposalCount();
      
      const fetchedProposals: Proposal[] = [];
      
      for (let i = 0; i < proposalCount; i++) {
        const proposalInfo = await contract.getProposalInfo(i);
        
        console.log("Proposal : ", proposalInfo)
        fetchedProposals.push({
          id: i,
          description: proposalInfo[0], // String
          recipient: proposalInfo[1], // Address
          totalAmount: ethers.formatEther(proposalInfo[2]),
          state: mapStateToString(Number(proposalInfo[3])),
          publicYesVotes: Number(proposalInfo[4]),
          publicNoVotes: Number(proposalInfo[5]),
          currentStage: Number(proposalInfo[6]),
          totalStages: Number(proposalInfo[7]),
          authorityYesVotes: Number(proposalInfo[8]),
          authorityNoVotes: Number(proposalInfo[9]),
          publicVotingEndTime: Number(proposalInfo[10]),
        });
      }
      
      setProposals(fetchedProposals);
    } catch (err) {
      console.error("Error fetching proposals:", err);
      onError("Failed to fetch proposals. " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const updateStageAmount = (index: number, value: string) => {
    const newStageAmounts = [...stageAmounts];
    newStageAmounts[index] = value;
    setStageAmounts(newStageAmounts);
  };

  const validateStageAmounts = () => {
    const total = stageAmounts
      .slice(0, stageCount)
      .filter(amount => !!amount)
      .reduce((sum, amount) => sum + parseFloat(amount || '0'), 0);

    return Math.abs(total - parseFloat(proposalTotalAmount || '0')) < 0.0001;
  };

  const createProposal = async () => {
    try {
      if (!proposalDescription || !proposalRecipient || !proposalTotalAmount) {
        throw new Error("Please fill all required fields");
      }

      if (!ethers.isAddress(proposalRecipient)) {
        throw new Error("Invalid recipient address");
      }

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

      setProposalDescription('');
      setProposalRecipient('');
      setProposalTotalAmount('');
      setStageAmounts(['', '', '']);
      setStageCount(3);
      
      // Refresh proposals list
      fetchProposals();
    } catch (err) {
      console.error("Error creating proposal:", err);
      onError("Failed to create proposal. " + (err as Error).message);
    }
  };
  
  const authorityVote = async (proposalId: number, approve: boolean) => {
    try {
      const contract = await getPublicFundingContract();
      const tx = await contract.authorityVoteOnProposal(proposalId, approve);
      await tx.wait();
      
      showNotification(`Vote recorded for proposal #${proposalId}`);
      
      // Refresh proposals
      fetchProposals();
    } catch (err) {
      console.error("Error voting on proposal:", err);
      onError("Failed to vote on proposal. " + (err as Error).message);
    }
  };


  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Authority Panel</h2>

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
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}