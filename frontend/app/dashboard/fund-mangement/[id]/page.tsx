import ProposalDetails  from '@/components/ProposalDeatils';

export function generateStaticParams() {
  return [
    { id: '0' },
    { id: '1' },
    { id: '2' },
    { id: '3' },
    { id: '4' },
    { id: '5' }
  ];
}

export default function ProposalPage() {
  return <ProposalDetails/>;
}