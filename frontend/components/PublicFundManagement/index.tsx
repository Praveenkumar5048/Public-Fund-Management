'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useProposals } from '@/hooks/useProposals';
import { useContractData } from '@/hooks/useContractData';
import { Dashboard } from './Dashboard';
import { AdminPanel } from './AdminPanel';
import { AuthorityPanel } from './AuthorityPanel';
import { ProposalsList } from './ProposalsList';
import { PublicVoting } from './PublicVoting';
import { StageReports } from './StageReports';
import { Header } from './Header';
import { Notification } from './Notification';
import { TabNavigation } from './TabNavigation';

export function PublicFundManagement() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notification, setNotification] = useState('');
  const [error, setError] = useState('');

  const { account, isAdmin, isAuthority } = useWallet();
  const { proposals, loadProposals } = useProposals();
  const { contractBalance, loadContractData } = useContractData();

  useEffect(() => {
    loadContractData();
    loadProposals();
  }, []);

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 5000);
  };

  if (!account) {
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
      <Header 
        account={account}
        isAdmin={isAdmin}
        isAuthority={isAuthority}
        contractBalance={contractBalance}
        onRefresh={loadContractData}
      />

      {notification && <Notification message={notification} type="success" />}
      {error && <Notification message={error} type="error" onClose={() => setError('')} />}

      <TabNavigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAdmin={isAdmin}
        isAuthority={isAuthority}
        proposals={proposals}
      />

      {activeTab === 'dashboard' && <Dashboard address={account} proposals={proposals} contractBalance={contractBalance} />}
      {activeTab === 'admin' && isAdmin && <AdminPanel showNotification={showNotification} onError={setError} />}
      {activeTab === 'authority' && isAuthority && <AuthorityPanel showNotification={showNotification} onError={setError} />}
      {activeTab === 'proposals' && <ProposalsList proposals={proposals} isAdmin={isAdmin} showNotification={showNotification} onError={setError} />}
      {activeTab === 'voting' && <PublicVoting proposals={proposals.filter(p => p.state === 'PublicVoting')} showNotification={showNotification} onError={setError} />}
      {activeTab === 'reports' && <StageReports proposals={proposals.filter(p => p.state === 'InProgress')} isAuthority={isAuthority} showNotification={showNotification} onError={setError} />}
    </div>
  );
}