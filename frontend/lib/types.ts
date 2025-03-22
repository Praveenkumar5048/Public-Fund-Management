export type ProposalState = 'Created' | 'UnderAuthorityVoting' | 'PublicVoting' | 'Approved' | 'Rejected' | 'InProgress' | 'Completed';
export type StageState = 'NotStarted' | 'InProgress' | 'Completed';

export interface Proposal {
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

export interface Stage {
  amount: string;
  report: string;
  voteCount: number;
  state: StageState;
}