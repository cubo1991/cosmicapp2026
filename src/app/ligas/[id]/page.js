'use client';

import RankingLiga from '@/components/tables/RankingLiga';

export default function LigaDetailPage({ params }) {
  const { id } = params;

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <a href="/ligas" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Volver a Ligas
        </a>
        <RankingLiga ligaId={id} />
      </div>
    </div>
  );
}
