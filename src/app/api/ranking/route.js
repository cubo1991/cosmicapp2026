import { rankingService } from '@/services/rankingService';

/**
 * GET /api/ranking
 * Retorna el ranking global de jugadores
 */
export async function GET(request) {
  try {
    const ranking = await rankingService.obtenerRankingGlobal();
    
    return Response.json({
      success: true,
      total: ranking.length,
      ranking
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
      }
    });
  } catch (error) {
    console.error('Error en GET /api/ranking:', error);
    
    return Response.json({
      success: false,
      error: error.message
    }, {
      status: 500
    });
  }
}
