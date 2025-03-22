'use client';

import { useState } from 'react';
import { Proposal } from '@/lib/types';
import { getPublicFundingContract } from '@/lib/publicFundingContract';

interface PublicVotingProps {
  proposals: Proposal[];
  showNotification: (message: string) => void;
  onError: (message: string) => void;
}

export function PublicVoting({ proposals, showNotification, onError }: PublicVotingProps) {
  const [publicVoteComment, setPublicVoteComment] = useState('');

  const publicVote = async (proposalId: number, vote: boolean) => {
    try {
      const contract = await getPublicFundingContract();
      const tx = await contract.publicVoteOnProposal(proposalId, vote, publicVoteComment);
      await tx.wait();

      showNotification(`Public vote recorded for proposal #${proposalId}`);
      setPublicVoteComment('');
    } catch (err) {
      console.error("Error public voting on proposal:", err);
      onError("Failed to vote. " + (err as Error).message);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Public Voting</h2>

      <div className="space-y-6">
        {proposals.map(proposal => (
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

        {proposals.length === 0 && (
          <p className="text-gray-600">No proposals are currently open for public voting.</p>
        )}
      </div>
    </div>
  );
}