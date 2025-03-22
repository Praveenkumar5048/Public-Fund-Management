// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

// Interface for the SBT contract
interface ISBT {
    function isRegisteredVoter(address voter) external view returns (bool);

    function getTokenIdByAddress(
        address _address
    ) external view returns (uint256);
}

contract PublicFundManagement {
    address public admin;
    mapping(address => bool) public authorities;
    uint256 public authorityCount;
    uint256 public contractBalance;

    // SBT contract reference
    ISBT public sbtContract;

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

    struct Stage {
        uint256 amount;
        string report;
        string aiReport;
        mapping(address => bool) hasVoted;
        uint256 voteCount;
        StageState state;
    }

    struct Proposal {
        uint256 id;
        string description;
        address recipient;
        uint256 totalAmount;
        uint256 authorityYesVotes;
        uint256 authorityNoVotes;
        uint256 publicYesVotes;
        uint256 publicNoVotes;
        mapping(address => bool) hasAuthorityVoted;
        // Added to track SBT voters who have already voted
        mapping(uint256 => bool) hasTokenVoted;
        ProposalState state;
        uint256 publicVotingEndTime;
        uint256 totalStages;
        mapping(uint256 => Stage) stages;
        uint256 currentStage;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;

    // ======
    // EVENTS
    // ======

    event AuthorityAdded(address authority);
    event AuthorityRemoved(address authority);
    event ProposalCreated(uint256 proposalId, address creator, uint256 amount);
    event AuthorityVoted(uint256 proposalId, address authority, bool vote);
    event PublicVotingStarted(uint256 proposalId, uint256 endTime);
    event PublicVoted(
        uint256 proposalId,
        address voter,
        bool vote,
        string comment
    );
    event ProposalApproved(uint256 proposalId);
    event ProposalRejected(uint256 proposalId);
    event StageAmountReleased(
        uint256 proposalId,
        uint256 stageNumber,
        uint256 amount
    );
    event StageReportSubmitted(
        uint256 proposalId,
        uint256 stageNumber,
        string report
    );
    event StageApproved(uint256 proposalId, uint256 stageNumber);
    event ProposalCompleted(uint256 proposalId);
    event FundsDeposited(address from, uint256 amount, uint256 newBalance);
    event FundsWithdrawn(address to, uint256 amount, uint256 newBalance);
    event SBTContractSet(address sbtContractAddress);
    event StageCompleted(uint256 proposalId, uint256 stageNumber);

    // ==========
    // MODIFIERS
    // ==========

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }

    modifier onlyAuthority() {
        require(
            authorities[msg.sender],
            "Only authorities can call this function"
        );
        _;
    }

    modifier proposalExists(uint256 _proposalId) {
        require(_proposalId < proposalCount, "Proposal does not exist");
        _;
    }

    modifier onlyRegisteredVoter() {
        require(address(sbtContract) != address(0), "SBT contract not set");
        require(
            sbtContract.isRegisteredVoter(msg.sender),
            "Only registered voters can call this function"
        );
        _;
    }

    // ===========
    // CONSTRUCTOR
    // ===========

    constructor(address _sbtContractAddress) {
        admin = msg.sender;
        authorities[msg.sender] = true;
        authorityCount = 1;

        // Set the SBT contract address immediately
        require(
            _sbtContractAddress != address(0),
            "Invalid SBT contract address"
        );
        sbtContract = ISBT(_sbtContractAddress);
        emit SBTContractSet(_sbtContractAddress);
    }

    // ================
    // ADMIN FUNCTIONS
    // ================

    /**
     * @dev Set the SBT contract address
     * @param _sbtContract Address of the SBT contract
     */
    function setSBTContract(address _sbtContract) external onlyAdmin {
        require(_sbtContract != address(0), "Invalid SBT contract address");
        sbtContract = ISBT(_sbtContract);
        emit SBTContractSet(_sbtContract);
    }

    /**
     * @dev Admin deposits funds into the contract
     */
    function depositFunds() external payable onlyAdmin {
        require(msg.value > 0, "Amount must be greater than 0");
        contractBalance += msg.value;
        emit FundsDeposited(msg.sender, msg.value, contractBalance);
    }

    /**
     * @dev Admin can withdraw unused funds in case of emergency
     * @param _amount Amount to withdraw
     */
    function withdrawFunds(uint256 _amount) external onlyAdmin {
        require(
            _amount > 0 && _amount <= contractBalance,
            "Invalid withdrawal amount"
        );
        contractBalance -= _amount;
        payable(admin).transfer(_amount);
        emit FundsWithdrawn(admin, _amount, contractBalance);
    }

    /**
     * @dev Add a new authority
     * @param _authority Address of the new authority
     */
    function addAuthority(address _authority) external onlyAdmin {
        require(!authorities[_authority], "Address is already an authority");
        authorities[_authority] = true;
        authorityCount++;
        emit AuthorityAdded(_authority);
    }

    /**
     * @dev Remove an authority
     * @param _authority Address of the authority to remove
     */
    function removeAuthority(address _authority) external onlyAdmin {
        require(_authority != admin, "Cannot remove admin from authorities");
        require(authorities[_authority], "Address is not an authority");
        authorities[_authority] = false;
        authorityCount--;
        emit AuthorityRemoved(_authority);
    }

    /**
     * @dev Close public voting and decide if proposal is approved
     * @param _proposalId ID of the proposal
     */
    function closePublicVoting(
        uint256 _proposalId
    ) external onlyAdmin proposalExists(_proposalId) {
        Proposal storage proposal = proposals[_proposalId];
        require(
            proposal.state == ProposalState.PublicVoting,
            "Proposal is not in public voting state"
        );
        //require(block.timestamp >= proposal.publicVotingEndTime, "Public voting period has not ended");

        if (proposal.publicYesVotes > proposal.publicNoVotes) {
            // Check if contract has enough funds for this proposal
            require(
                contractBalance >= proposal.totalAmount,
                "Contract does not have enough funds for this proposal"
            );

            proposal.state = ProposalState.Approved;

            emit ProposalApproved(_proposalId);
        } else {
            proposal.state = ProposalState.Rejected;
            emit ProposalRejected(_proposalId);
        }
    }

    /**
     * @dev Release funds for a stage
     * @param _proposalId ID of the proposal
     */
    function releaseStageAmount(
        uint256 _proposalId
    ) external onlyAdmin proposalExists(_proposalId) {
        Proposal storage proposal = proposals[_proposalId];
        uint256 currentStage = proposal.currentStage;

        if (currentStage == 0) {
            require(
                proposal.state == ProposalState.Approved,
                "Proposal is not approved"
            );
            proposal.state = ProposalState.InProgress;
        } else {
            require(
                proposal.stages[currentStage - 1].state == StageState.Completed,
                "Previous stage not completed"
            );
        }

        require(
            currentStage < proposal.totalStages,
            "All stages already released"
        );

        Stage storage stage = proposal.stages[currentStage];
        require(stage.state == StageState.NotStarted, "Stage already started");

        // Check if contract has enough funds
        require(
            contractBalance >= stage.amount,
            "Contract does not have enough funds for this stage"
        );

        stage.state = StageState.InProgress;

        // Update contract balance
        contractBalance -= stage.amount;

        // Transfer funds to recipient
        payable(proposal.recipient).transfer(stage.amount);

        emit StageAmountReleased(_proposalId, currentStage, stage.amount);

        proposal.currentStage++;
    }

    function ProposalStageCompleted(
        uint256 proposalId,
        uint256 stageNumber
    ) external onlyAdmin proposalExists(proposalId) {
        Proposal storage proposal = proposals[proposalId];
        require(
            proposal.state == ProposalState.InProgress,
            "Proposal is not in progress"
        );
        require(stageNumber < proposal.totalStages, "Invalid stage number");

        Stage storage stage = proposal.stages[stageNumber];
        require(
            stage.state == StageState.InProgress,
            "Stage is not in progress"
        );
        stage.state = StageState.Completed;
        emit StageCompleted(proposalId, stageNumber);

        if (stageNumber == proposal.totalStages - 1) {
            proposal.state = ProposalState.Completed;
            emit ProposalCompleted(proposalId);
        } else {
            uint256 nextStageIndex = stageNumber + 1;
            Stage storage nextStage = proposal.stages[nextStageIndex];
            require(
                contractBalance >= nextStage.amount,
                "Contract does not have enough funds for this stage"
            );
            contractBalance -= nextStage.amount;
            nextStage.state = StageState.InProgress;
            
            payable(proposal.recipient).transfer(nextStage.amount);
            proposal.currentStage = nextStageIndex;
        }
    }

    // ====================
    // AUTHORITY FUNCTIONS
    // ====================

    /**
     * @dev Create a new proposal
     * @param _description Description of the proposal
     * @param _recipient Address that will receive the funds
     * @param _totalAmount Total amount to be distributed
     * @param _stageAmounts Array of amounts for each stage
     */
    function createProposal(
        string calldata _description,
        address _recipient,
        uint256 _totalAmount,
        uint256[] calldata _stageAmounts
    ) external onlyAuthority {
        require(
            _stageAmounts.length > 0 && _stageAmounts.length <= 3,
            "Must have 1-3 stages"
        );
        require(_recipient != address(0), "Invalid recipient address");

        uint256 totalStageAmount = 0;
        for (uint256 i = 0; i < _stageAmounts.length; i++) {
            totalStageAmount += _stageAmounts[i];
        }
        require(
            totalStageAmount == _totalAmount,
            "Sum of stage amounts must equal total amount"
        );

        uint256 proposalId = proposalCount;
        Proposal storage newProposal = proposals[proposalId];

        newProposal.id = proposalId;
        newProposal.description = _description;
        newProposal.recipient = _recipient;
        newProposal.totalAmount = _totalAmount;
        newProposal.state = ProposalState.Created;
        newProposal.totalStages = _stageAmounts.length;

        // Initialize stage amounts
        for (uint256 i = 0; i < _stageAmounts.length; i++) {
            Stage storage stage = newProposal.stages[i];
            stage.amount = _stageAmounts[i];
            stage.state = StageState.NotStarted;
        }

        proposalCount++;

        emit ProposalCreated(proposalId, msg.sender, _totalAmount);

        // Auto-transition to authority voting
        newProposal.state = ProposalState.UnderAuthorityVoting;
    }

    /**
     * @dev Vote on a proposal as an authority
     * @param _proposalId ID of the proposal
     * @param _vote True for yes, false for no
     */
    function authorityVoteOnProposal(
        uint256 _proposalId,
        bool _vote
    ) external onlyAuthority proposalExists(_proposalId) {
        Proposal storage proposal = proposals[_proposalId];
        require(
            proposal.state == ProposalState.UnderAuthorityVoting,
            "Proposal is not under authority voting"
        );
        require(
            !proposal.hasAuthorityVoted[msg.sender],
            "Authority has already voted"
        );

        proposal.hasAuthorityVoted[msg.sender] = true;

        if (_vote) {
            proposal.authorityYesVotes++;
        } else {
            proposal.authorityNoVotes++;
        }

        emit AuthorityVoted(_proposalId, msg.sender, _vote);

        // Check if we have enough votes
        if (proposal.authorityYesVotes > authorityCount / 2) {
            proposal.state = ProposalState.PublicVoting;
            proposal.publicVotingEndTime = block.timestamp + 7 days; // Public voting lasts for 7 days
            console.log("Public voting started", proposal.publicVotingEndTime);
            emit PublicVotingStarted(_proposalId, proposal.publicVotingEndTime);
        }
    }

    /**
     * @dev Submit report for a stage
     * @param _proposalId ID of the proposal
     * @param _stageNumber Stage number (0-indexed)
     * @param _report Report text
     */
    function submitStageReport(
        uint256 _proposalId,
        uint256 _stageNumber,
        string calldata _report
    ) external proposalExists(_proposalId) {
        Proposal storage proposal = proposals[_proposalId];
        require(
            msg.sender == proposal.recipient,
            "Only recipient can submit report"
        );
        require(_stageNumber < proposal.totalStages, "Invalid stage number");

        Stage storage stage = proposal.stages[_stageNumber];
        require(
            stage.state == StageState.InProgress,
            "Stage is not in progress"
        );
        require(bytes(stage.report).length == 0, "Report already submitted");

        stage.report = _report;

        emit StageReportSubmitted(_proposalId, _stageNumber, _report);
    }

    /**
     * @dev Vote on a stage report
     * @param _proposalId ID of the proposal
     * @param _stageNumber Stage number
     * @param _approve Whether to approve the stage
     */
    function voteOnStage(
        uint256 _proposalId,
        uint256 _stageNumber,
        bool _approve
    ) external onlyAuthority proposalExists(_proposalId) {
        Proposal storage proposal = proposals[_proposalId];
        require(
            proposal.state == ProposalState.InProgress,
            "Proposal is not in progress"
        );
        require(_stageNumber < proposal.totalStages, "Invalid stage number");

        Stage storage stage = proposal.stages[_stageNumber];
        require(
            stage.state == StageState.InProgress,
            "Stage is not in progress"
        );
        require(bytes(stage.report).length > 0, "Report not submitted yet");
        require(
            !stage.hasVoted[msg.sender],
            "Authority has already voted on this stage"
        );

        stage.hasVoted[msg.sender] = true;

        if (_approve) {
            stage.voteCount++;
        }

        // Check if we have enough votes to approve the stage
        if (stage.voteCount > authorityCount / 2) {
            stage.state = StageState.Completed;
            emit StageApproved(_proposalId, _stageNumber);

            // If this was the last stage, mark proposal as completed
            if (_stageNumber == proposal.totalStages - 1) {
                proposal.state = ProposalState.Completed;
                emit ProposalCompleted(_proposalId);
            }
        }
    }

    // ===================
    // PUBLIC FUNCTIONS
    // ===================

    /**
     * @dev Vote on a proposal as a member of the public with an SBT token
     * @param _proposalId ID of the proposal
     * @param _vote True for yes, false for no
     * @param _comment Comment on the vote
     */
    function publicVoteOnProposal(
        uint256 _proposalId,
        bool _vote,
        string calldata _comment
    ) external onlyRegisteredVoter proposalExists(_proposalId) {
        Proposal storage proposal = proposals[_proposalId];
        require(
            proposal.state == ProposalState.PublicVoting,
            "Proposal is not open for public voting"
        );
        //require(block.timestamp < proposal.publicVotingEndTime, "Public voting period has ended");

        // Get the voter's token ID from the SBT contract
        uint256 tokenId = sbtContract.getTokenIdByAddress(msg.sender);

        // Check that this token hasn't already voted
        require(
            !proposal.hasTokenVoted[tokenId],
            "This SBT has already been used to vote on this proposal"
        );

        // Mark the token as having voted
        proposal.hasTokenVoted[tokenId] = true;

        if (_vote) {
            proposal.publicYesVotes++;
        } else {
            proposal.publicNoVotes++;
        }

        emit PublicVoted(_proposalId, msg.sender, _vote, _comment);
    }

    /**
     * @dev Check if a voter has already voted on a proposal
     * @param _proposalId ID of the proposal
     * @param _voter Address of the voter to check
     * @return Whether the voter has already voted
     */
    function hasVoted(
        uint256 _proposalId,
        address _voter
    ) external view proposalExists(_proposalId) returns (bool) {
        require(address(sbtContract) != address(0), "SBT contract not set");

        // Check if the address is a registered voter
        if (!sbtContract.isRegisteredVoter(_voter)) {
            return false;
        }

        // Get the voter's token ID
        uint256 tokenId = sbtContract.getTokenIdByAddress(_voter);

        // Return whether this token has already voted
        return proposals[_proposalId].hasTokenVoted[tokenId];
    }

    /**
     * @dev Get proposal information
     * @param _proposalId ID of the proposal
     * @return description Description of the proposal
     * @return recipient Address that will receive the funds
     * @return totalAmount Total amount to be distributed
     * @return state Current state of the proposal
     * @return publicYesVotes Number of yes votes from the public
     * @return publicNoVotes Number of no votes from the public
     * @return currentStage Current stage of the proposal
     * @return totalStages Total number of stages
     */
    function getProposalInfo(
        uint256 _proposalId
    )
        external
        view
        proposalExists(_proposalId)
        returns (
            string memory description,
            address recipient,
            uint256 totalAmount,
            ProposalState state,
            uint256 publicYesVotes,
            uint256 publicNoVotes,
            uint256 currentStage,
            uint256 totalStages,
            uint256 authorityYesVotes,
            uint256 authorityNoVotes,
            uint256 publicVotingEndTime
        )
    {
        Proposal storage proposal = proposals[_proposalId];
        return (
            proposal.description,
            proposal.recipient,
            proposal.totalAmount,
            proposal.state,
            proposal.publicYesVotes,
            proposal.publicNoVotes,
            proposal.currentStage,
            proposal.totalStages,
            proposal.authorityYesVotes,
            proposal.authorityNoVotes,
            proposal.publicVotingEndTime
        );
    }

    /**
     * @dev Get stage information
     * @param _proposalId ID of the proposal
     * @param _stageNumber Stage number
     * @return amount Amount allocated for this stage
     * @return report Report submitted for this stage
     * @return aiReport AI report for this stage
     * @return voteCount Number of yes votes from authorities
     * @return state Current state of the stage
     */
    function getStageInfo(
        uint256 _proposalId,
        uint256 _stageNumber
    )
        external
        view
        proposalExists(_proposalId)
        returns (
            uint256 amount,
            string memory report,
            string memory aiReport,
            uint256 voteCount,
            StageState state
        )
    {
        require(
            _stageNumber < proposals[_proposalId].totalStages,
            "Invalid stage number"
        );
        Stage storage stage = proposals[_proposalId].stages[_stageNumber];
        return (
            stage.amount,
            stage.report,
            stage.aiReport,
            stage.voteCount,
            stage.state
        );
    }

    /**
     * @dev Get the current contract balance
     * @return Current balance of the contract
     */
    function getContractBalance() external view returns (uint256) {
        return contractBalance;
    }
}
