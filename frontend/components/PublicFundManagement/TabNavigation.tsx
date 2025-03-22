'use client';

import { Proposal } from '@/lib/types';

interface TabNavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAdmin: boolean;
  isAuthority: boolean;
  proposals: Proposal[];
}

export function TabNavigation({ activeTab, setActiveTab, isAdmin, isAuthority, proposals }: TabNavigationProps) {
  return (
    <div className="mb-6 border-b">
      <nav className="flex flex-wrap -mb-px">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`mr-2 py-2 px-4 ${activeTab === 'dashboard' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
        >
          Dashboard
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`mr-2 py-2 px-4 ${activeTab === 'admin' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
          >
            Admin Panel
          </button>
        )}
        {isAuthority && (
          <button
            onClick={() => setActiveTab('authority')}
            className={`mr-2 py-2 px-4 ${activeTab === 'authority' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
          >
            Authority Panel
          </button>
        )}
        <button
          onClick={() => setActiveTab('proposals')}
          className={`mr-2 py-2 px-4 ${activeTab === 'proposals' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
        >
          Proposals
        </button>
        {proposals.some(p => p.state === 'PublicVoting') && (
          <button
            onClick={() => setActiveTab('voting')}
            className={`mr-2 py-2 px-4 ${activeTab === 'voting' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
          >
            Public Voting
          </button>
        )}
        {proposals.some(p => p.state === 'InProgress') && (
          <button
            onClick={() => setActiveTab('reports')}
            className={`mr-2 py-2 px-4 ${activeTab === 'reports' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
          >
            Stage Reports
          </button>
        )}
      </nav>
    </div>
  );
}