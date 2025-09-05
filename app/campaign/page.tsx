'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function CampaignContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const type = searchParams.get('type');
  const id = searchParams.get('id');
  const name = searchParams.get('name');
  const idol = searchParams.get('idol');
  
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>('');
  const [missionStatus, setMissionStatus] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [artist, setArtist] = useState<{ id: string; name: string } | null>(null);
  const [albumFromTrack, setAlbumFromTrack] = useState<{ id: string; name: string } | null>(null);
  const [coverBase64, setCoverBase64] = useState<string>('');
  const [showId, setShowId] = useState('');
  const [episodeId, setEpisodeId] = useState('');
  const OFFICIAL_COVER = process.env.NEXT_PUBLIC_OFFICIAL_COVER || 'official-cover.jpg';

  // Feature flags: podcasts (shows/episodes)
  const FEATURE_PODCASTS = Number(process.env.NEXT_PUBLIC_FEATURE_PODCASTS ?? '1');
  const hidePodcasts = FEATURE_PODCASTS === -1;
  const disablePodcasts = FEATURE_PODCASTS === 0;

  useEffect(() => {
    fetchPlaylists();
    if (type === 'track' && id) {
      fetch(`/api/tracks/${id}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.artists?.length) setArtist(data.artists[0]);
          if (data?.album) setAlbumFromTrack(data.album);
        })
        .catch(() => {});
    }
  }, []);

  const fetchPlaylists = async () => {
    try {
      const response = await fetch('/api/me/playlists');
      if (response.ok) {
        const data = await response.json();
        setPlaylists(data.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch playlists:', error);
    }
  };

  const verifyPlay = async () => {
    setLoading({ ...loading, play: true });
    try {
      const response = await fetch(`/api/me/recently-played?targetTrackId=${id}&windowHours=24`);
      const data = await response.json();
      
      if (data.verified) {
        setMissionStatus({ ...missionStatus, play: 'SUCCESS: Track was played recently!' });
      } else {
        setMissionStatus({ ...missionStatus, play: 'FAILED: Track not found in recent plays' });
      }
    } catch (error) {
      setMissionStatus({ ...missionStatus, play: 'ERROR: Could not verify' });
    }
    setLoading({ ...loading, play: false });
  };

  const saveToLibrary = async (saveType: 'track' | 'album') => {
    const key = `save_${saveType}`;
    setLoading({ ...loading, [key]: true });
    
    const endpoint = saveType === 'track' ? '/api/me/tracks' : '/api/me/albums';
    const payload = saveType === 'track' ? { trackId: id } : { albumId: id };
    
    try {
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (response.ok) {
        setMissionStatus({ ...missionStatus, [key]: `SUCCESS: ${saveType} saved to library!` });
      } else {
        setMissionStatus({ ...missionStatus, [key]: `FAILED: Could not save ${saveType}` });
      }
    } catch (error) {
      setMissionStatus({ ...missionStatus, [key]: 'ERROR: Request failed' });
    }
    setLoading({ ...loading, [key]: false });
  };

  const addToPlaylist = async () => {
    if (!selectedPlaylist) {
      alert('Please select a playlist');
      return;
    }
    
    setLoading({ ...loading, playlist: true });
    try {
      const response = await fetch(`/api/playlists/${selectedPlaylist}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: id }),
      });
      
      const data = await response.json();
      if (data.success) {
        setMissionStatus({ ...missionStatus, playlist: `SUCCESS: Added to playlist! Snapshot: ${data.snapshot_id}` });
      } else {
        setMissionStatus({ ...missionStatus, playlist: 'FAILED: Could not add to playlist' });
      }
    } catch (error) {
      setMissionStatus({ ...missionStatus, playlist: 'ERROR: Request failed' });
    }
    setLoading({ ...loading, playlist: false });
  };

  const createPlaylist = async () => {
    setLoading({ ...loading, createPlaylist: true });
    try {
      const response = await fetch('/api/me/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'KPD Missions' }),
      });
      
      if (response.ok) {
        await fetchPlaylists();
        alert('Playlist created!');
      }
    } catch (error) {
      alert('Failed to create playlist');
    }
    setLoading({ ...loading, createPlaylist: false });
  };

  const pinToTop = async () => {
    if (!selectedPlaylist) { alert('Please select a playlist'); return; }
    setLoading({ ...loading, pin: true });
    try {
      const res = await fetch(`/api/playlists/${selectedPlaylist}/reorder-top`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: id }),
      });
      const data = await res.json();
      if (data.success) {
        setMissionStatus({ ...missionStatus, pin: `SUCCESS: snapshot ${data.snapshot_id || ''}` });
      } else {
        setMissionStatus({ ...missionStatus, pin: 'FAILED: Could not pin to top' });
      }
    } catch (e) {
      setMissionStatus({ ...missionStatus, pin: 'ERROR: Request failed' });
    }
    setLoading({ ...loading, pin: false });
  };

  const uploadCover = async () => {
    if (!selectedPlaylist) { alert('Please select a playlist'); return; }
    setLoading({ ...loading, cover: true });
    try {
      const res = await fetch(`/api/playlists/${selectedPlaylist}/image`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetKey: OFFICIAL_COVER, useDefault: true }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMissionStatus({ ...missionStatus, cover: 'SUCCESS: Cover updated (may take a few minutes to show)' });
      } else {
        setMissionStatus({ ...missionStatus, cover: 'FAILED: Could not update cover' });
      }
    } catch {
      setMissionStatus({ ...missionStatus, cover: 'ERROR: Request failed' });
    }
    setLoading({ ...loading, cover: false });
  };

  const presaveNow = async () => {
    const albumTargetId = type === 'album' ? id : albumFromTrack?.id;
    if (!albumTargetId) { alert('Album not available yet'); return; }
    setLoading({ ...loading, presave: true });
    try {
      const res = await fetch('/api/presave/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ albumId: albumTargetId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMissionStatus({ ...missionStatus, presave: 'SUCCESS: Album saved (pre-save)' });
      } else {
        setMissionStatus({ ...missionStatus, presave: 'FAILED: Could not save album' });
      }
    } catch {
      setMissionStatus({ ...missionStatus, presave: 'ERROR: Request failed' });
    }
    setLoading({ ...loading, presave: false });
  };

  const verifyPresave = async () => {
    try {
      const albumTargetId = type === 'album' ? id : albumFromTrack?.id;
      if (!albumTargetId) { setMissionStatus({ ...missionStatus, presave_verify: 'FAILED: No album to verify' }); return; }
      const res = await fetch(`/api/me/albums/contains?ids=${albumTargetId}`);
      const arr = await res.json();
      const ok = Array.isArray(arr) ? arr[0] : false;
      setMissionStatus({ ...missionStatus, presave_verify: ok ? 'SUCCESS: Album in library' : 'FAILED: Not in library yet' });
    } catch {
      setMissionStatus({ ...missionStatus, presave_verify: 'ERROR: Verify failed' });
    }
  };

  const followArtist = async () => {
    if (!artist?.id) { alert('Artist not available'); return; }
    setLoading({ ...loading, follow: true });
    try {
      const res = await fetch('/api/me/following/artist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistId: artist.id }),
      });
      if (res.ok) {
        const verify = await fetch(`/api/me/following/artist/contains?ids=${artist.id}`);
        const arr = await verify.json();
        const ok = Array.isArray(arr) ? arr[0] : false;
        setMissionStatus({ ...missionStatus, follow: ok ? 'SUCCESS: Following artist' : 'FAILED: Follow not confirmed' });
      } else {
        setMissionStatus({ ...missionStatus, follow: 'FAILED: Follow failed' });
      }
    } catch {
      setMissionStatus({ ...missionStatus, follow: 'ERROR: Request failed' });
    }
    setLoading({ ...loading, follow: false });
  };

  const saveShow = async () => {
    if (!showId) { alert('Enter a show ID'); return; }
    setLoading({ ...loading, show: true });
    try {
      const res = await fetch('/api/me/shows', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ showId }) });
      setMissionStatus({ ...missionStatus, show: res.ok ? 'SUCCESS: Show saved' : 'FAILED: Could not save show' });
    } catch { setMissionStatus({ ...missionStatus, show: 'ERROR: Request failed' }); }
    setLoading({ ...loading, show: false });
  };

  const saveEpisode = async () => {
    if (!episodeId) { alert('Enter an episode ID'); return; }
    setLoading({ ...loading, episode: true });
    try {
      const res = await fetch('/api/me/episodes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ episodeId }) });
      setMissionStatus({ ...missionStatus, episode: res.ok ? 'SUCCESS: Episode saved' : 'FAILED: Could not save episode' });
    } catch { setMissionStatus({ ...missionStatus, episode: 'ERROR: Request failed' }); }
    setLoading({ ...loading, episode: false });
  };

  if (!type || !id || !name) {
    return <div>No target selected. Please go back and select a release.</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Campaign: {idol}</h1>
      <h2>Target: {name}</h2>
      <p>Type: {type} | ID: {id}</p>

      <div style={{ marginTop: '2rem' }}>
        <a href="/me">View Completion History</a>
      </div>

      <div style={{ 
        display: 'grid', 
        gap: '2rem', 
        marginTop: '2rem',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))'
      }}>
        {/* Play Verification Mission */}
        {type === 'track' && (
          <div style={{ 
            border: '2px solid #1DB954', 
            borderRadius: '8px', 
            padding: '1.5rem' 
          }}>
            <h3>Mission: Play Verification</h3>
            <p>Play the track in Spotify, then verify!</p>
            <button 
              onClick={verifyPlay}
              disabled={loading.play}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#1DB954',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading.play ? 'wait' : 'pointer',
                width: '100%'
              }}
            >
              {loading.play ? 'Verifying...' : 'Verify I played it today'}
            </button>
            {missionStatus.play && (
              <div style={{ 
                marginTop: '1rem', 
                padding: '0.5rem',
                backgroundColor: missionStatus.play.includes('SUCCESS') ? '#d4edda' : '#f8d7da',
                borderRadius: '4px'
              }}>
                {missionStatus.play}
              </div>
            )}
          </div>
        )}

        {/* Add to Playlist Mission */}
        {type === 'track' && (
          <div style={{ 
            border: '2px solid #1DB954', 
            borderRadius: '8px', 
            padding: '1.5rem' 
          }}>
            <h3>Mission: Add to Playlist</h3>
            <select 
              value={selectedPlaylist} 
              onChange={(e) => setSelectedPlaylist(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
            >
              <option value="">Select a playlist</option>
              {playlists.map((playlist: any) => (
                <option key={playlist.id} value={playlist.id}>
                  {playlist.name}
                </option>
              ))}
            </select>
            <button 
              onClick={createPlaylist}
              disabled={loading.createPlaylist}
              style={{
                padding: '0.5rem 1rem',
                marginBottom: '0.5rem',
                width: '100%',
                cursor: loading.createPlaylist ? 'wait' : 'pointer'
              }}
            >
              {loading.createPlaylist ? 'Creating...' : 'Create "KPD Missions" Playlist'}
            </button>
            <button 
              onClick={addToPlaylist}
              disabled={loading.playlist || !selectedPlaylist}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#1DB954',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading.playlist ? 'wait' : 'pointer',
                width: '100%'
              }}
            >
              {loading.playlist ? 'Adding...' : 'Add to Playlist'}
            </button>
            {missionStatus.playlist && (
              <div style={{ 
                marginTop: '1rem', 
                padding: '0.5rem',
                backgroundColor: missionStatus.playlist.includes('SUCCESS') ? '#d4edda' : '#f8d7da',
                borderRadius: '4px',
                wordBreak: 'break-all'
              }}>
                {missionStatus.playlist}
              </div>
            )}
          </div>
        )}

        {/* Pin to Top Mission */}
        {type === 'track' && (
          <div style={{ border: '2px solid #1DB954', borderRadius: '8px', padding: '1.5rem' }}>
            <h3>Mission: Pin Track to Top</h3>
            <p>Ensure the target track is at position 1 in the selected playlist.</p>
            <button onClick={pinToTop} disabled={loading.pin || !selectedPlaylist} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#1DB954', color: 'white', border: 'none', borderRadius: '4px', cursor: loading.pin ? 'wait' : 'pointer', width: '100%' }}>
              {loading.pin ? 'Reordering...' : 'Pin to Top'}
            </button>
            {missionStatus.pin && (
              <div style={{ marginTop: '1rem', padding: '0.5rem', backgroundColor: missionStatus.pin.includes('SUCCESS') ? '#d4edda' : '#f8d7da', borderRadius: '4px' }}>{missionStatus.pin}</div>
            )}
          </div>
        )}

        {/* Save Track Mission */}
        {type === 'track' && (
          <div style={{ 
            border: '2px solid #1DB954', 
            borderRadius: '8px', 
            padding: '1.5rem' 
          }}>
            <h3>Mission: Save Track</h3>
            <p>Save this track to your library</p>
            <button 
              onClick={() => saveToLibrary('track')}
              disabled={loading.save_track}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#1DB954',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading.save_track ? 'wait' : 'pointer',
                width: '100%'
              }}
            >
              {loading.save_track ? 'Saving...' : 'Save Track to Library'}
            </button>
            {missionStatus.save_track && (
              <div style={{ 
                marginTop: '1rem', 
                padding: '0.5rem',
                backgroundColor: missionStatus.save_track.includes('SUCCESS') ? '#d4edda' : '#f8d7da',
                borderRadius: '4px'
              }}>
                {missionStatus.save_track}
              </div>
            )}
          </div>
        )}

        {/* Save Album Mission */}
        {type === 'album' && (
          <div style={{ 
            border: '2px solid #1DB954', 
            borderRadius: '8px', 
            padding: '1.5rem' 
          }}>
            <h3>Mission: Save Album</h3>
            <p>Save this album to your library</p>
            <button 
              onClick={() => saveToLibrary('album')}
              disabled={loading.save_album}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#1DB954',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading.save_album ? 'wait' : 'pointer',
                width: '100%'
              }}
            >
              {loading.save_album ? 'Saving...' : 'Save Album to Library'}
            </button>
            {missionStatus.save_album && (
              <div style={{ 
                marginTop: '1rem', 
                padding: '0.5rem',
                backgroundColor: missionStatus.save_album.includes('SUCCESS') ? '#d4edda' : '#f8d7da',
                borderRadius: '4px'
              }}>
                {missionStatus.save_album}
              </div>
            )}
          </div>
        )}

        {/* Change Playlist Cover Mission */}
        <div style={{ border: '2px solid #1DB954', borderRadius: '8px', padding: '1.5rem' }}>
          <h3>Mission: Apply Official Playlist Cover</h3>
          <p>This will set the official campaign cover for your selected playlist.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <img src={`/${OFFICIAL_COVER.replace(/^\/+/, '')}`} alt="Official cover" style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 8, border: '1px solid #ccc' }} />
            <div style={{ flex: 1 }}>
              <button onClick={uploadCover} disabled={loading.cover || !selectedPlaylist} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#1DB954', color: 'white', border: 'none', borderRadius: '4px', cursor: loading.cover ? 'wait' : 'pointer', width: '100%' }}>
                {loading.cover ? 'Applying...' : 'Apply Official Cover'}
              </button>
            </div>
          </div>
          {missionStatus.cover && (
            <div style={{ marginTop: '1rem', padding: '0.5rem', backgroundColor: missionStatus.cover.includes('SUCCESS') ? '#d4edda' : '#f8d7da', borderRadius: '4px' }}>{missionStatus.cover}</div>
          )}
        </div>

        {/* Pre-save Upcoming Release (Album) */}
        {(type === 'album' || (type === 'track' && albumFromTrack)) && (
          <div style={{ border: '2px solid #1DB954', borderRadius: '8px', padding: '1.5rem' }}>
            <h3>Mission: Pre-save Album (Dev)</h3>
            <p>
              Dev-only: Save this album now to simulate pre-save.
              {type === 'track' && albumFromTrack && (
                <span> Target album: {albumFromTrack.name}</span>
              )}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={presaveNow} disabled={loading.presave} style={{ padding: '0.5rem 1rem' }}>{loading.presave ? 'Saving...' : 'Pre-save Now'}</button>
              <button onClick={verifyPresave} style={{ padding: '0.5rem 1rem' }}>Verify Saved</button>
            </div>
            {missionStatus.presave && (
              <div style={{ marginTop: '1rem', padding: '0.5rem', backgroundColor: missionStatus.presave.includes('SUCCESS') ? '#d4edda' : '#f8d7da', borderRadius: '4px' }}>{missionStatus.presave}</div>
            )}
            {missionStatus.presave_verify && (
              <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: missionStatus.presave_verify.includes('SUCCESS') ? '#d4edda' : '#f8d7da', borderRadius: '4px' }}>{missionStatus.presave_verify}</div>
            )}
          </div>
        )}

        {/* Follow Artist */}
        {type === 'track' && (
          <div style={{ border: '2px solid #1DB954', borderRadius: '8px', padding: '1.5rem' }}>
            <h3>Mission: Follow Artist</h3>
            <p>{artist ? `Target: ${artist.name}` : 'Loading artist...'}</p>
            <button onClick={followArtist} disabled={loading.follow || !artist} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#1DB954', color: 'white', border: 'none', borderRadius: '4px', cursor: loading.follow ? 'wait' : 'pointer', width: '100%' }}>
              {loading.follow ? 'Following...' : 'Follow Artist'}
            </button>
            {missionStatus.follow && (
              <div style={{ marginTop: '1rem', padding: '0.5rem', backgroundColor: missionStatus.follow.includes('SUCCESS') ? '#d4edda' : '#f8d7da', borderRadius: '4px' }}>{missionStatus.follow}</div>
            )}
          </div>
        )}

        {/* Save Show / Episode (Dev helper) */}
        {!hidePodcasts && (
          <div style={{ border: '2px solid #1DB954', borderRadius: '8px', padding: '1.5rem' }}>
            <h3>Mission: Save Show / Episode</h3>
            {disablePodcasts && (
              <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#555' }}>
                Temporarily disabled
              </div>
            )}
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <div>
                <input placeholder="Show ID (e.g., 5CfCWKI5pZ28U0uOzXkDHe)" value={showId} onChange={(e) => setShowId(e.target.value)} style={{ width: '100%', padding: '0.5rem' }} />
                <button onClick={saveShow} disabled={loading.show || disablePodcasts} style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', opacity: disablePodcasts ? 0.5 : 1 }}>
                  {loading.show ? 'Saving...' : 'Save Show'}
                </button>
              </div>
              <div>
                <input placeholder="Episode ID" value={episodeId} onChange={(e) => setEpisodeId(e.target.value)} style={{ width: '100%', padding: '0.5rem' }} />
                <button onClick={saveEpisode} disabled={loading.episode || disablePodcasts} style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', opacity: disablePodcasts ? 0.5 : 1 }}>
                  {loading.episode ? 'Saving...' : 'Save Episode'}
                </button>
              </div>
            </div>
            {(missionStatus.show || missionStatus.episode) && (
              <div style={{ marginTop: '1rem', padding: '0.5rem', backgroundColor: (missionStatus.show || missionStatus.episode)?.includes('SUCCESS') ? '#d4edda' : '#f8d7da', borderRadius: '4px' }}>{missionStatus.show || missionStatus.episode}</div>
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: '2rem' }}>
        <button onClick={() => router.push('/')}>Back to Search</button>
      </div>
    </div>
  );
}

export default function CampaignPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CampaignContent />
    </Suspense>
  );
}
