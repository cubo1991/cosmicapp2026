'use client';

import RankingCopa from '@/components/tables/RankingCopa';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function CopaDetailPage() {
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <Link href="/copas" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Volver a Copas
        </Link>
        <RankingCopa copaId={id} />
      </div>
    </div>
  );
}
