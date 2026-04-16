'use client';

import RankingCopa from '@/components/tables/RankingCopa';

export default function CopaDetailPage({ params }) {
  const { id } = params;

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <a href="/copas" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Volver a Copas
        </a>
        <RankingCopa copaId={id} />
      </div>
    </div>
  );
}
