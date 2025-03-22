'use client';

interface HeaderProps {
  account: string;
  isAdmin: boolean;
  isAuthority: boolean;
  contractBalance: string;
  onRefresh: () => void;
}

export function Header({ account, isAdmin, isAuthority, contractBalance, onRefresh }: HeaderProps) {
  return (
    <header className="mb-8">
      <h1 className="text-3xl font-bold mb-4">Public Fund Management</h1>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-gray-600">Contract Balance: <span className="font-bold">{contractBalance} ETH</span></p>
          <p className="text-gray-600">Connected Account: <span className="font-mono">{account || 'Not connected'}</span></p>
          <p className="text-gray-600">
            Role: <span className="font-bold">
              {isAdmin ? 'Admin' : isAuthority ? 'Authority' : 'Public User'}
            </span>
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          Refresh Data
        </button>
      </div>
    </header>
  );
}