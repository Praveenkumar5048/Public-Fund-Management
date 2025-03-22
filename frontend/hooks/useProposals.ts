'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { getPublicFundingContract } from '@/lib/publicFundingContract';
import { Proposal, ProposalState } from '@/lib/types';

export function useProposals() {
  const [proposals, setProposals] = useState<Proposal[]>([]);

  const loadProposals = async () => {
    try {
      const contract = await getPublicFundingContract();
      const proposalCount = await contract.proposalCount();

      const proposalsData: Proposal[] = [];
      for (let i = 0; i < proposalCount; i++) {
        const proposalInfo = await contract.getProposalInfo(i);
        const proposal: Proposal = {
          id: i,
          description: proposalInfo[0],
          recipient: proposalInfo[1],
          totalAmount: ethers.formatEther(proposalInfo[2]),
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
      console.error("Error loading proposals:", err);
    }
  };

  const mapStateToString = (state: number): ProposalState => {
    const states: ProposalState[] = [
      'Created', 'UnderAuthorityVoting', 'PublicVoting',
      'Approved', 'Rejected', 'InProgress', 'Completed'
    ];
    return states[state];
  };

  return { proposals, loadProposals };
}