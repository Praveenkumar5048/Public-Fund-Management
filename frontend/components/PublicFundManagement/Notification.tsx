'use client';

interface NotificationProps {
  message: string;
  type: 'success' | 'error';
  onClose?: () => void;
}

export function Notification({ message, type, onClose }: NotificationProps) {
  const bgColor = type === 'success' ? 'bg-green-100' : 'bg-red-100';
  const borderColor = type === 'success' ? 'border-green-400' : 'border-red-400';
  const textColor = type === 'success' ? 'text-green-700' : 'text-red-700';

  return (
    <div className={`mb-6 p-4 ${bgColor} border ${borderColor} ${textColor} rounded`}>
      <div className="flex justify-between">
        <p>{message}</p>
        {onClose && (
          <button onClick={onClose} className="font-bold">×</button>
        )}
      </div>
    </div>
  );
}