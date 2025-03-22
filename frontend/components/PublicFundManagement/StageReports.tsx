'use client';

import { useState, useEffect } from 'react';
import { Proposal, Stage } from '@/lib/types';
import { getPublicFundingContract } from '@/lib/publicFundingContract';
import axios from 'axios';
import { ethers } from 'ethers';

interface StageReportsProps {
  proposals: Proposal[];
  isAuthority: boolean;
  showNotification: (message: string) => void;
  onError: (message: string) => void;
}

export function StageReports({ proposals, isAuthority, showNotification, onError }: StageReportsProps) {
  const [selectedProposalForReport, setSelectedProposalForReport] = useState<number | null>(null);
  const [selectedStageForReport, setSelectedStageForReport] = useState<number | null>(null);
  const [stageReportFile, setStageReportFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [stageInfoMap, setStageInfoMap] = useState<{[key: string]: Stage | null}>({});
  

  useEffect(() => {
    // Load stage info for all proposals
    const loadAllStageInfo = async () => {
      for (const proposal of proposals) {
        if (proposal.currentStage > 0) {
          await getStageInfo(proposal.id, proposal.currentStage - 1);
        }
      }
    };
    
    loadAllStageInfo();
  }, [proposals]); 

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setStageReportFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setStageReportFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const submitReport = async () => {
    try {
      if (selectedProposalForReport === null || selectedStageForReport === null) {
        throw new Error("Please select a proposal and stage");
      }
  
      if (!stageReportFile) {
        throw new Error("Please upload a PDF report");
      }
  
      setIsUploading(true);
  
      const formData = new FormData();
      formData.append('file', stageReportFile);
      
      const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          pinata_api_key: "449f8e2d82e11b754f29",
          pinata_secret_api_key: "8e6da3c908a4d317fe4686b7db62842d88e03b11284734a7f1ae86e8c1f03abe",
        },
      });
      
      const ipfsCid = response.data.IpfsHash;
      
      const contract = await getPublicFundingContract();
      const tx = await contract.submitStageReport(
        selectedProposalForReport,
        selectedStageForReport,
        ipfsCid
      );
      await tx.wait();
  
      showNotification(`Report submitted for proposal #${selectedProposalForReport} stage #${selectedStageForReport}`);
      setStageReportFile(null);
      setSelectedProposalForReport(null);
      setSelectedStageForReport(null);
    } catch (err) {
      console.error("Error submitting report:", err);
      onError("Failed to submit report. " + (err as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  const voteOnStage = async (proposalId: number, stageNumber: number, approve: boolean) => {
    try {
      const contract = await getPublicFundingContract();
      const tx = await contract.voteOnStage(proposalId, stageNumber, approve);
      await tx.wait();

      showNotification(`Vote recorded for proposal #${proposalId} stage #${stageNumber}`);
    } catch (err) {
      console.error("Error voting on stage:", err);
      onError("Failed to vote on stage. " + (err as Error).message);
    }
  };

  const getStageInfo = async (proposalId: number, stageNumber: number) => {
    try {
      const contract = await getPublicFundingContract();
      const stageInfo = await contract.getStageInfo(proposalId, stageNumber);

      const info: Stage = {
        amount: ethers.formatEther(stageInfo.amount),
        report: stageInfo.report,
        voteCount: stageInfo.voteCount,
        state: mapStageStateToString(stageInfo.state)
      };

      setStageInfoMap(prev => ({
        ...prev,
        [`${proposalId}-${stageNumber}`]: info
      }));

      return info;
    } catch (err) {
      console.error("Error getting stage info:", err);
      onError("Failed to get stage info. " + (err as Error).message);
      return null;
    }
  };

  const mapStageStateToString = (state: number): any => {
    const states: any[] = ['NotStarted', 'InProgress', 'Completed'];
    return states[state];
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Stage Reports</h2>

      {proposals.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h3 className="text-xl font-semibold mb-4">Submit Stage Report</h3>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-gray-700 mb-2">Select Proposal</label>
              <select
                value={selectedProposalForReport !== null ? selectedProposalForReport.toString() : ''}
                onChange={(e) => {
                  const selectedId = e.target.value ? parseInt(e.target.value) : null;
                  setSelectedProposalForReport(selectedId);
                  const selectedProposal = proposals.find(p => p.id === selectedId);
                  setSelectedStageForReport(selectedProposal ? selectedProposal.currentStage-1: null);
                }}
                className="w-full p-2 border rounded"
              >
                <option value="">Choose a proposal...</option>
                {proposals.map(p => (
                  <option key={p.id} value={p.id}>
                    Proposal #{p.id} - Stage {p.currentStage}
                  </option>
                ))}
              </select>
            </div>

            {selectedProposalForReport !== null && (
              <>
                <div>
                  <label className="block text-gray-700 mb-2">Upload Stage Report (PDF)</label>
                  <div 
                    className={`border-2 border-dashed rounded-lg p-6 text-center ${
                      stageReportFile ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-blue-500'
                    }`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                  >
                    {stageReportFile ? (
                      <div className="flex flex-col items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <p className="font-semibold">{stageReportFile.name}</p>
                        <p className="text-sm text-gray-500 mb-2">({Math.round(stageReportFile.size / 1024)} KB)</p>
                        <button
                          onClick={() => setStageReportFile(null)}
                          className="text-red-500 underline text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="mb-1">Drag and drop your PDF report here</p>
                        <p className="text-sm text-gray-500 mb-2">or</p>
                        <label className="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                          Browse Files
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf"
                            onChange={handleFileChange}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={submitReport}
                  disabled={isUploading || !stageReportFile}
                  className={`bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400 ${
                    isUploading ? 'opacity-70' : ''
                  }`}
                >
                  {isUploading ? (
                    <span className="flex items-center justify-center">
                      <span className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></span>
                      Uploading...
                    </span>
                  ) : (
                    'Submit Report'
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {proposals.map(proposal => {
          const stageKey = `${proposal.id}-${proposal.currentStage - 1}`;
          const stageInfo = stageInfoMap[stageKey];

          return (
            <div key={proposal.id} className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold mb-4">
                Proposal #{proposal.id} - Stage {proposal.currentStage} of {proposal.totalStages}
              </h3>

              {stageInfo ? (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-gray-600">Stage Amount</p>
                      <p className="font-semibold">{stageInfo.amount} ETH</p>
                    </div>
                    <div>
                      <p className="text-gray-600">State</p>
                      <p className="font-semibold">{stageInfo.state}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Approval Votes</p>
                      <p className="font-semibold">{stageInfo.voteCount}</p>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-gray-600">Stage Report</p>
                    {stageInfo.report ? (
                      <div className="p-3 bg-gray-50 rounded border">
                        <p className="mb-2">Report uploaded to IPFS</p>
                        <a 
                          href={`https://gateway.pinata.cloud/ipfs/${stageInfo.report}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 underline flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          View PDF Report
                        </a>
                      </div>
                    ) : (
                      <p className="p-3 bg-gray-50 rounded border">No report submitted yet</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-gray-600 mb-4">Loading stage details...</p>
              )}

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
          );
        })}

        {proposals.length === 0 && (
          <p className="text-gray-600">No proposals are currently in progress.</p>
        )}
      </div>
    </div>
  );
}