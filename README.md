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
- All report documents (PDFs) are uploaded to the IPFS network, with only the CID (Content Identifier) stored on the blockchain for efficient storage and immutability

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
- **Decentralized Storage**: IPFS network for document storage with CIDs recorded on-chain
- **Frontend**: Next.js with Web3.js integration
- **AI Document Verification**:
  - RAG (Retrieval Augmented Generation) technology
  - LangChain framework for document processing
  - Large Language Models for intelligent verification
  - Vector databases for document comparison and authentication

## Details of Backend

A Django REST API backend for automated funding approval that analyzes government documents using Retrieval Augmented Generation (RAG) to determine if project funding should be approved, rejected, or reviewed.

## Overview

This backend API uses advanced NLP techniques to analyze government funding documents and automatically determine approval status. The system:

1. Accepts document uploads in various formats (PDF, DOCX, TXT)
2. Processes documents using LangChain and Groq's LLM
3. Evaluates documents against standard criteria
4. Returns a detailed analysis and funding decision

## Setup

### Prerequisites

- Python 3.8+
- GROQ API key

### Installation

1. Create and activate a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Clone the repository:

```
git clone https://github.com/Sagarshivalingappaathani/Public-Fund-Management.git
cd Public-Fund-Management/backend/
```

3. Install required packages:

```bash
pip install -r requirements.txt
```

4. Create a `.env` file with your GROQ API key:

```
GROQ_API_KEY=your_groq_api_key_here
DJANGO_SECRET_KEY=your_django_key
```

5.Run migrations and start the server:

```
python manage.py migrate
python manage.py runserver
```

## API Documentation

### Endpoint

```
POST /analyze/
```

### Request Format

The API accepts multipart/form-data requests with:

| Parameter        | Type | Required | Description                                             |
| ---------------- | ---- | -------- | ------------------------------------------------------- |
| file             | File | Yes      | Document to analyze (PDF, DOCX, TXT)                    |
| custom_questions | JSON | No       | Array of additional questions to ask about the document |

### Example Request

Using curl:

```bash
curl -X POST \
  -F "file=@/path/to/document.pdf" \
  -F "custom_questions=[\"What is the project budget for infrastructure?\", \"Who are the key stakeholders?\"]" \
  http://localhost:8000/analyze/
```

Using Python requests:

```python
import requests
import json

url = "http://localhost:8000/analyze/"
files = {'file': open('proposal.pdf', 'rb')}
data = {
    'custom_questions': json.dumps([
        "What is the project budget for infrastructure?",
        "Who are the key stakeholders?"
    ])
}

response = requests.post(url, files=files, data=data)
print(response.json())
```

### Response Format

```json
{
  "status": "APPROVED", // or "REJECTED" or "REVIEW"
  "report": {
    "analysis": [
      {
        "Question": "What is the amount of budget installment approved from government?",
        "Answer": "According to the document, the government has approved a budget of $2.5 million for this project."
      }
      // Additional question/answer pairs
    ],
    "decision": "DECISION: APPROVED\n\nBased on the analysis of the provided government document, this funding request should be approved for the following reasons:\n\n1. Budget and Expenditure Alignment: The approved budget of $2.5 million is properly accounted for in the expenditure plan..."
  },
  "cid_hash": "cid_string"
}
```

## How It Works

### Document Processing Flow

1. **Document Upload**: The API receives a document file through the POST request.

2. **Document Loading**: The system loads the document using appropriate loaders based on file type (PyPDFLoader, Docx2txtLoader, or TextLoader).

3. **Text Chunking**: The document is split into smaller chunks using RecursiveCharacterTextSplitter for efficient processing.

4. **Embedding Generation**: Text chunks are converted to vector embeddings using HuggingFace's sentence-transformers.

5. **Vector Store Creation**: Embeddings are stored in a FAISS vector database for efficient retrieval.

6. **Question Answering**: The system poses a series of standard evaluation questions (and any custom questions) to the RAG system.

7. **Decision Making**: Based on the answers, the LLM makes a funding decision (APPROVED, REJECTED, or REVIEW).

8. **Response Generation**: The API returns the decision status and detailed analysis.

### Standard Evaluation Questions

The system evaluates documents using these standard questions:

- Budget approval and installment details
- Project objectives and alignment with government priorities
- Implementation timeline
- Expected outcomes and deliverables
- Fund utilization breakdown
- Planning and risk management
- Potential discrepancies in fund usage
- Other potential red flags

### Decision Criteria

The funding decision is based on:

1. Budget approval matching with expenditure
2. Clarity and definition of project details
3. Absence of fund misuse or discrepancies
4. Risk assessment
5. Expected impact and outcomes

## Error Handling

The API provides appropriate HTTP status codes and error messages:

- 400 Bad Request: Missing file, unsupported file type, or invalid custom_questions format
- 500 Internal Server Error: Processing errors

## Extending the API

### Adding Custom Standard Questions

Edit the `STANDARD_QUESTIONS` list in utils.py to modify the default evaluation criteria.

### Modifying Decision Logic

The decision-making logic can be customized by editing the `DECISION_PROMPT` template in utils.py.

### Using Different Models

The system currently uses Groq's Llama 3 70B model. To use a different model, modify the model configuration in the `create_rag_system` and `make_decision` functions.

## Benefits

- **Enhanced Transparency**: All transactions, votes, and decisions are permanently recorded on the blockchain
- **Public Participation**: Citizens directly influence fund allocation decisions
- **Fraud Prevention**: Smart contracts enforce rules and prevent unauthorized fund transfers
- **Efficiency**: AI-powered verification eliminates delays caused by manual document checking
- **Accountability**: Stage-wise funding ensures recipients deliver before receiving additional funds
- **Reduced Corruption**: Automated verification and immutable records minimize opportunities for corruption

## Sample Output

> This is a sample output file generated by AI, after first round report submission.

[output.pdf](files/output.pdf)

<embed src='files/output.pdf' type='application/pdf' width=700px height=700px />

## Team

- Sagar Athani (221IT058)
- Praveen Kumar (221IT052)
- Adya N A (221AI006)
- Vijay Kumar B (221AI043)
