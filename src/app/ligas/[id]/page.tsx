'use client';

import Link from 'next/link';
import RankingLiga from '@/components/tables/RankingLiga';

export default function LigaDetailPage({ params }) {
  const { id } = params;

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <Link href="/ligas" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Volver a Ligas
        </Link>
        <RankingLiga ligaId={id} />
      </div>
    </div>
  );
}
