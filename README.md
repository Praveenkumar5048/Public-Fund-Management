# FundVerify : Automated Decentralised Government Fund Allocation and AI Verification

## Introduction

The Public Fund Management System is a decentralized application built on the Ethereum blockchain that revolutionizes how government funds are allocated, managed, and monitored. By combining blockchain technology with artificial intelligence, we create a transparent, efficient, and tamper-proof system for public fund management.

## Problem Statement

Traditional government fund allocation faces several critical challenges:

1. **Lack of Transparency**: Citizens often have limited visibility into how public funds are allocated and spent.
2. **Inefficient Verification**: The manual verification of fund utilization reports is time-consuming, prone to errors, and vulnerable to corruption.
3. **Delayed Fund Disbursement**: Traditional bureaucratic processes create bottlenecks, delaying project implementation and increasing costs.
4. **Limited Accountability**: Without transparent tracking, it's difficult to hold recipients accountable for proper fund utilization.

## Our Solution

Our Public Fund Management System addresses these challenges through a unique combination of blockchain technology and artificial intelligence:

### Core Components:

1. **Ethereum-Based Smart Contracts**: Immutable contracts coded in Solidity that enforce transparent fund allocation rules.
2. **Decentralized Governance**: Multi-level approval system involving both authorities and public citizens.
3. **Staged Fund Distribution**: Funds released in installments, with each subsequent release contingent on proper utilization of previous funds.
4. **AI-Powered Verification**: Automated document verification using RAG technology, LangChain, and generative AI to validate fund utilization reports.

## Features & Workflow

### Admin and Authority Management
- The deployer of the smart contract becomes the Admin
- Admin can add or remove trusted authorities (government officials or trusted entities)
- Distributed responsibility ensures no single point of failure or control

### Proposal Creation & Internal Voting
- Any authorized Authority can create a funding proposal
- Other Authorities vote on the proposal for initial screening
- Proposals must receive >50% approval from Authorities to advance
- Failed proposals are rejected with transparent reasoning

### Public Voting & Feedback
- Approved proposals are published for public review and voting
- We use **Soulbound Tokens (SBT)** for public identity verification, ensuring each citizen can vote only once
- Citizens can vote YES/NO and provide comments/feedback
- Admin closes voting after predetermined period
- Proposals with >50% public approval advance to funding stage

### Staged Fund Distribution
- Approved funds are allocated in three stages rather than a lump sum
- Stage 1: Initial funding released to Proposal Creator (Recipient)
- Recipient submits detailed utilization report before requesting next stage funding

### AI-Powered Verification & Automated Progression
- Submitted reports are automatically verified using:
  - **Retrieval Augmented Generation (RAG)** technology
  - LangChain framework
  - Generative AI models
- Verification checks for:
  - Authenticity of receipts and documents
  - Alignment with proposal objectives
  - Appropriate fund utilization
- Upon successful verification, next stage funding is automatically released
- Failed verifications trigger review processes

## Technical Architecture

Our system is built with the following technologies:

- **Blockchain**: Ethereum platform with Solidity smart contracts
- **Frontend**: Next.js with Web3.js integration
- **AI Document Verification**:
  - RAG (Retrieval Augmented Generation) technology
  - LangChain framework for document processing
  - Large Language Models for intelligent verification
  - Vector databases for document comparison and authentication

## Benefits

- **Enhanced Transparency**: All transactions, votes, and decisions are permanently recorded on the blockchain
- **Public Participation**: Citizens directly influence fund allocation decisions
- **Fraud Prevention**: Smart contracts enforce rules and prevent unauthorized fund transfers
- **Efficiency**: AI-powered verification eliminates delays caused by manual document checking
- **Accountability**: Stage-wise funding ensures recipients deliver before receiving additional funds
- **Reduced Corruption**: Automated verification and immutable records minimize opportunities for corruption

## Future Enhancements

- Integration with government identity verification systems
- Mobile application for easier citizen participation
- Enhanced analytics dashboard for public fund tracking
- Multi-chain implementation for cross-government collaboration

## Team

- Sagar Athani (221IT058)
- Praveen Kumar (221IT052)
- Vijay Kumar B (221AI043)
- Adhya N A (221AI006)

