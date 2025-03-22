'use client';

import { Proposal } from '@/lib/types';
import { getPublicFundingContract } from '@/lib/publicFundingContract';

interface ProposalsListProps {
  proposals: Proposal[];
  isAdmin: boolean;
  showNotification: (message: string) => void;
  onError: (message: string) => void;
}

export function ProposalsList({ proposals, isAdmin, showNotification, onError }: ProposalsListProps) {
  const closePublicVoting = async (proposalId: number) => {
    try {
      const contract = await getPublicFundingContract();
      const tx = await contract.closePublicVoting(proposalId);
      await tx.wait();

      showNotification(`Public voting closed for proposal #${proposalId}`);
    } catch (err) {
      console.error("Error closing public voting:", err);
      onError("Failed to close voting. " + (err as Error).message);
    }
  };

  const releaseStageAmount = async (proposalId: number) => {
    try {
      const contract = await getPublicFundingContract();
      const tx = await contract.releaseStageAmount(proposalId);
      await tx.wait();

      showNotification(`Stage funds released for proposal #${proposalId}`);
    } catch (err) {
      console.error("Error releasing stage amount:", err);
      onError("Failed to release funds. " + (err as Error).message);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">All Proposals</h2>

      <div className="space-y-6">
        {proposals.map(proposal => (
          <div key={proposal.id} className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold">Proposal #{proposal.id}</h3>
              <span className={`px-3 py-1 rounded text-sm ${
                proposal.state === 'Completed' ? 'bg-green-100 text-green-800' :
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
                <p className="font-semibold">{proposal.currentStage} of {proposal.totalStages}</p>
              </div>
              <div>
                <p className="text-gray-600">Votes</p>
                <p className="font-semibold">
                  Yes: {proposal.publicYesVotes} / No: {proposal.publicNoVotes}
                </p>
              </div>
            </div>

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
  );
}