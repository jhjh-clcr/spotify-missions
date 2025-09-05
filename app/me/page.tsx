import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

export default async function MePage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;

  let completions: any[] = [];
  
  if (userId) {
    completions = await prisma.missionCompletion.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>Mission Completions</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <a href="/">Back to Home</a>
      </div>

      {completions.length === 0 ? (
        <p>No mission completions yet. Complete some missions first!</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #333' }}>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Time</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Mission</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Target</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {completions.map((completion) => {
              const details = completion.details as any;
              const missionType = completion.missionId.split('_')[0] + '_' + completion.missionId.split('_')[1];
              
              return (
                <tr key={completion.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '0.5rem' }}>
                    {new Date(completion.createdAt).toLocaleString()}
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    {missionType}
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    {details.targetTrackId || details.trackId || details.albumId || 'N/A'}
                  </td>
                  <td style={{ 
                    padding: '0.5rem',
                    color: completion.status === 'SUCCESS' ? 'green' : 'red',
                    fontWeight: 'bold'
                  }}>
                    {completion.status}
                  </td>
                  <td style={{ padding: '0.5rem', fontSize: '0.85rem' }}>
                    {details.snapshotId && `Snapshot: ${details.snapshotId.substring(0, 10)}...`}
                    {details.matchedTrack && `Played: ${details.matchedTrack.trackName}`}
                    {details.error && `Error: ${details.error}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}