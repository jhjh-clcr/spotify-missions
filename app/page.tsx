'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [idol, setIdol] = useState('aespa');
  const [release, setRelease] = useState('');
  const [trackId, setTrackId] = useState('');
  const [albumId, setAlbumId] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState('');
  const [jsonOutput, setJsonOutput] = useState<any>({ hint: 'API responses will appear here' });
  const [completions, setCompletions] = useState<any[]>([]);
  const [quizTrackStatus, setQuizTrackStatus] = useState('');
  const [quizAlbumStatus, setQuizAlbumStatus] = useState('');
  const [mission2Status, setMission2Status] = useState('');
  const [mission1Status, setMission1Status] = useState('');
  const [mission3Status, setMission3Status] = useState('');
  const [mission4Status, setMission4Status] = useState('');
  const [mission5Status, setMission5Status] = useState('');
  const [mission6Status, setMission6Status] = useState('');
  const [mission7Status, setMission7Status] = useState('');
  const [mission8Status, setMission8Status] = useState('');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  // Local score system (per mission+target, first success only)
  const [score, setScore] = useState(0);
  const [scorePulse, setScorePulse] = useState(false);
  const SCORE_KEY = 'kpm_score';
  const AWARD_KEY = 'kpm_awarded_v1';
  const [missionFollowPlaylistStatus, setMissionFollowPlaylistStatus] = useState('');
  
  // Additional states for new missions
  const [artist, setArtist] = useState<{ id: string; name: string } | null>(null);
  const [albumFromTrack, setAlbumFromTrack] = useState<{ id: string; name: string } | null>(null);
  const [selectedTrackInfo, setSelectedTrackInfo] = useState<any | null>(null);
  const [selectedAlbumInfo, setSelectedAlbumInfo] = useState<any | null>(null);
  const [coverBase64, setCoverBase64] = useState('');
  const [showId, setShowId] = useState('');
  const [episodeId, setEpisodeId] = useState('');
  const OFFICIAL_COVER = process.env.NEXT_PUBLIC_OFFICIAL_COVER || 'official-cover.jpg';
  const QUIZ_TKO_ALBUM_ID = process.env.NEXT_PUBLIC_QUIZ_TKO_ALBUM_ID || '0YaLbDxHTeZLT3CpDunKuT';
  const QUIZ_TKO_TRACK_ID = process.env.NEXT_PUBLIC_QUIZ_TKO_TRACK_ID || '0Q5VnK2DYzRyfqQRJuUtvi';
  const OFFICIAL_IVE_PLAYLIST_ID = process.env.NEXT_PUBLIC_OFFICIAL_IVE_PLAYLIST_ID || '37i9dQZF1DX6pLfLmbGM3d';
  // Feature flags: podcasts (shows/episodes)
  const FEATURE_PODCASTS = Number(process.env.NEXT_PUBLIC_FEATURE_PODCASTS ?? '1');
  const hidePodcasts = FEATURE_PODCASTS === -1;
  const disablePodcasts = FEATURE_PODCASTS === 0;

  // Load completions from database on mount
  useEffect(() => {
    fetchCompletions();
  }, []);

  // Load score + awarded set from localStorage, keep in sync across tabs
  useEffect(() => {
    try {
      const s = Number(localStorage.getItem(SCORE_KEY) || '0');
      setScore(Number.isFinite(s) && s >= 0 ? s : 0);
    } catch {}
    const onStorage = (e: StorageEvent) => {
      if (e.key === SCORE_KEY && e.newValue != null) {
        const n = Number(e.newValue);
        if (Number.isFinite(n)) setScore(n);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const getAwardSet = (): Set<string> => {
    try {
      const raw = localStorage.getItem(AWARD_KEY);
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    } catch {}
    return new Set();
  };

  const saveAwardSet = (setObj: Set<string>) => {
    try { localStorage.setItem(AWARD_KEY, JSON.stringify(Array.from(setObj))); } catch {}
  };

  const awardOnce = (key: string) => {
    try {
      const setObj = getAwardSet();
      if (setObj.has(key)) return false;
      setObj.add(key);
      const next = (Number(localStorage.getItem(SCORE_KEY) || '0') || 0) + 1;
      localStorage.setItem(SCORE_KEY, String(next));
      saveAwardSet(setObj);
      setScore(next);
      try {
        setScorePulse(true);
        setTimeout(() => setScorePulse(false), 700);
      } catch {}
      return true;
    } catch { return false; }
  };

  const resetScore = () => {
    try {
      localStorage.setItem(SCORE_KEY, '0');
      localStorage.removeItem(AWARD_KEY);
      setScore(0);
    } catch {}
  };

  // Keep completions fresh: on tab focus and periodic polling
  useEffect(() => {
    const onVisible = () => { if (!document.hidden) fetchCompletions(); };
    document.addEventListener('visibilitychange', onVisible);
    const id = setInterval(() => { fetchCompletions(); }, 10000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(id as any);
    };
  }, []);

  // Fetch track details when trackId changes
  useEffect(() => {
    if (trackId) {
      fetch(`/api/tracks/${trackId}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.artists?.length) setArtist(data.artists[0]);
          if (data?.album) setAlbumFromTrack(data.album);
        })
        .catch(() => {});
    }
  }, [trackId]);

  // Keep selected track/album info in sync with IDs and latest search results
  useEffect(() => {
    if (searchResults?.tracks && trackId) {
      const found = searchResults.tracks.find((t: any) => t.id === trackId);
      if (found) {
        setSelectedTrackInfo(found);
        if (found.albumId && found.albumName) setAlbumFromTrack({ id: found.albumId, name: found.albumName });
      }
    }
  }, [trackId, searchResults]);

  useEffect(() => {
    if (searchResults?.albums && albumId) {
      const found = searchResults.albums.find((a: any) => a.id === albumId);
      if (found) setSelectedAlbumInfo(found);
    }
  }, [albumId, searchResults]);

  // Auto-clear quiz banners after 3 seconds
  useEffect(() => {
    if (!quizTrackStatus) return;
    const t = setTimeout(() => setQuizTrackStatus(''), 3000);
    return () => clearTimeout(t);
  }, [quizTrackStatus]);

  useEffect(() => {
    if (!quizAlbumStatus) return;
    const t = setTimeout(() => setQuizAlbumStatus(''), 3000);
    return () => clearTimeout(t);
  }, [quizAlbumStatus]);

  // Auto-clear mission banners (3s)
  useEffect(() => { if (!mission2Status) return; const t = setTimeout(() => setMission2Status(''), 3000); return () => clearTimeout(t); }, [mission2Status]);
  useEffect(() => { if (!mission1Status) return; const t = setTimeout(() => setMission1Status(''), 3000); return () => clearTimeout(t); }, [mission1Status]);
  useEffect(() => { if (!mission3Status) return; const t = setTimeout(() => setMission3Status(''), 3000); return () => clearTimeout(t); }, [mission3Status]);
  useEffect(() => { if (!mission4Status) return; const t = setTimeout(() => setMission4Status(''), 3000); return () => clearTimeout(t); }, [mission4Status]);
  useEffect(() => { if (!mission5Status) return; const t = setTimeout(() => setMission5Status(''), 3000); return () => clearTimeout(t); }, [mission5Status]);
  useEffect(() => { if (!mission6Status) return; const t = setTimeout(() => setMission6Status(''), 3000); return () => clearTimeout(t); }, [mission6Status]);
  useEffect(() => { if (!mission7Status) return; const t = setTimeout(() => setMission7Status(''), 3000); return () => clearTimeout(t); }, [mission7Status]);
  useEffect(() => { if (!mission8Status) return; const t = setTimeout(() => setMission8Status(''), 3000); return () => clearTimeout(t); }, [mission8Status]);
  useEffect(() => { if (!missionFollowPlaylistStatus) return; const t = setTimeout(() => setMissionFollowPlaylistStatus(''), 3000); return () => clearTimeout(t); }, [missionFollowPlaylistStatus]);

  const fetchCompletions = async () => {
    try {
      const response = await fetch('/api/me/completions', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setCompletions(data.completions || []);
      }
    } catch (error) {
      console.error('Failed to fetch completions:', error);
    }
  };

  const log = (mission: string, target: string, status: string) => {
    const newCompletion = {
      time: new Date().toLocaleString(),
      mission,
      target: target || '',
      status
    };
    setCompletions(prev => [newCompletion, ...prev]);
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(idol)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
        setJsonOutput(data);
        
        // Auto-set first track and album IDs if available
        if (data.tracks?.length > 0) {
          setTrackId(data.tracks[0].id);
          setSelectedTrackInfo(data.tracks[0]);
          if (data.tracks[0].albumId && data.tracks[0].albumName) {
            setAlbumFromTrack({ id: data.tracks[0].albumId, name: data.tracks[0].albumName });
          }
        }
        if (data.albums?.length > 0) {
          setAlbumId(data.albums[0].id);
          setSelectedAlbumInfo(data.albums[0]);
        }
      } else if (response.status === 401) {
        alert('Please connect Spotify first');
      }
    } catch (error) {
      console.error('Search failed:', error);
      setJsonOutput({ error: 'Search failed' });
    }
    setLoading(false);
  };

  const selectTrack = (t: any) => {
    setTrackId(t.id);
    setSelectedTrackInfo(t);
    if (t.albumId && t.albumName) setAlbumFromTrack({ id: t.albumId, name: t.albumName });
  };

  const selectAlbum = (a: any) => {
    setAlbumId(a.id);
    setSelectedAlbumInfo(a);
  };

  // Selecting a track/album via the cards sets the targets directly

  // Mission 1: Play Verification
  const verifyPlay = async () => {
    if (!trackId) { setMission1Status('Please select a track first'); return; }
    try {
      const response = await fetch(`/api/me/recently-played?targetTrackId=${trackId}&windowMinutes=10`);
      const data = await response.json();
      setJsonOutput(data);
      log('PLAY_VERIFY', trackId, data.verified ? 'SUCCESS' : 'FAILED');
      setMission1Status(data.verified ? 'SUCCESS: Track played within last 10 minutes' : 'FAILED: Track not found in last 10 minutes');
      if (data.verified) awardOnce(`play_verify:${trackId}`);
      await fetchCompletions();
    } catch (error) {
      log('PLAY_VERIFY', trackId, 'ERROR');
      setMission1Status('ERROR: Verification request failed');
      await fetchCompletions();
    }
  };

  // Mission 2: Add to Playlist
  const listPlaylists = async () => {
    try {
      const response = await fetch('/api/me/playlists');
      const data = await response.json();
      setPlaylists(data.items || []);
      setJsonOutput(data);
    } catch (error) {
      // no inline state needed; message shown only for actions
    }
  };

  const createPlaylist = async () => {
    try {
      const name = (newPlaylistName || '').trim() || 'KPD Missions';
      const response = await fetch('/api/me/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, public: true })
      });
      const data = await response.json();
      setJsonOutput(data);
      await listPlaylists();
      if (data.id) {
        setSelectedPlaylist(data.id);
        setMission2Status(`SUCCESS: Created playlist “${name}”`);
        setNewPlaylistName('');
      }
    } catch (error) {
      setMission2Status('ERROR: Failed to create playlist');
    }
  };

  const addToPlaylist = async () => {
    if (!trackId) { setMission2Status('Please select a track first'); return; }
    if (!selectedPlaylist) { setMission2Status('Please select a playlist first'); return; }
    try {
      const response = await fetch(`/api/playlists/${selectedPlaylist}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId })
      });
      const data = await response.json();
      setJsonOutput(data);
      log('ADD_TO_PLAYLIST', trackId, data.success ? 'SUCCESS' : 'FAILED');
      setMission2Status(data.success ? 'SUCCESS: Track added to playlist' : 'FAILED: Could not add track');
      if (data.success) awardOnce(`add_to_playlist:${trackId}`);
      await fetchCompletions();
    } catch (error) {
      log('ADD_TO_PLAYLIST', trackId, 'ERROR');
      setMission2Status('ERROR: Request failed while adding to playlist');
      await fetchCompletions();
    }
  };

  // Mission 3: Pin Track to Top
  const pinToTop = async () => {
    if (!selectedPlaylist) { setMission4Status('Please select a playlist first'); return; }
    if (!trackId) { setMission4Status('Please select a track first'); return; }
    try {
      const response = await fetch(`/api/playlists/${selectedPlaylist}/reorder-top`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId })
      });
      const data = await response.json();
      setJsonOutput(data);
      log('PIN_TO_TOP', trackId, data.snapshot_id ? 'SUCCESS' : 'FAILED');
      if (data.success || data.snapshot_id) awardOnce(`reorder_top:${trackId}`);
      setMission4Status(data.snapshot_id ? 'SUCCESS: Moved to top' : 'FAILED: Could not reorder');
      await fetchCompletions();
    } catch (error) {
      log('PIN_TO_TOP', trackId, 'ERROR');
      setMission4Status('ERROR: Request failed while reordering');
      await fetchCompletions();
    }
  };

  // Mission 4 & 5: Save Track/Album
  const saveTrack = async () => {
    if (!trackId) { setMission5Status('Please select a track first'); return; }
    try {
      const response = await fetch('/api/me/tracks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId })
      });
      const data = await response.json();
      setJsonOutput(data);
      log('SAVE_TRACK', trackId, data.success ? 'SUCCESS' : 'FAILED');
      if (data.success) awardOnce(`save_track:${trackId}`);
      setMission5Status(data.success ? 'SUCCESS: Track saved to library' : 'FAILED: Could not save track');
      await fetchCompletions();
    } catch (error) {
      log('SAVE_TRACK', trackId, 'ERROR');
      setMission5Status('ERROR: Request failed while saving track');
      await fetchCompletions();
    }
  };

  const saveAlbum = async () => {
    try {
      const target = albumId || albumFromTrack?.id;
      if (!target) {
        setMission3Status('Please select an album (or select a track to infer its album)');
        return;
      }
      const response = await fetch('/api/me/albums', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ albumId: target })
      });
      const data = await response.json();
      setJsonOutput(data);
      log('SAVE_ALBUM', target, data.success ? 'SUCCESS' : 'FAILED');
      if (data.success) awardOnce(`save_album:${target}`);
      setMission3Status(data.success ? 'SUCCESS: Album saved to library' : 'FAILED: Could not save album');
      await fetchCompletions();
    } catch (error) {
      log('SAVE_ALBUM', albumId || albumFromTrack?.id || '', 'ERROR');
      setMission3Status('ERROR: Request failed while saving album');
      await fetchCompletions();
    }
  };

  // Mission 6: Apply Official Playlist Cover
  const loadOfficialCover = async () => {
    try {
      const response = await fetch('/' + OFFICIAL_COVER.replace(/^\/+/, ''));
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result?.toString().split(',')[1];
        if (base64) {
          setCoverBase64(base64);
        }
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      // ignore; only used for convenience preview
    }
  };

  const applyCover = async () => {
    if (!selectedPlaylist) { setMission6Status('Please select a playlist first'); return; }
    try {
      const response = await fetch(`/api/playlists/${selectedPlaylist}/image`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          coverBase64
            ? { imageBase64: coverBase64 }
            : { assetKey: OFFICIAL_COVER, useDefault: true }
        )
      });
      const data = await response.json();
      setJsonOutput(data);
      log('APPLY_COVER', selectedPlaylist, data.success ? 'SUCCESS' : 'FAILED');
      if (data.success) awardOnce(`apply_cover:${selectedPlaylist}`);
      setMission6Status(data.success ? 'SUCCESS: Cover applied (may take time to reflect)' : 'FAILED: Could not update cover');
      await fetchCompletions();
    } catch (error) {
      log('APPLY_COVER', selectedPlaylist, 'ERROR');
      setMission6Status('ERROR: Request failed while applying cover');
      await fetchCompletions();
    }
  };

  // Mission 7: Pre-save Album
  const presaveAlbum = async () => {
    try {
      const target = albumId || albumFromTrack?.id;
      if (!target) { setMission7Status('Please select an album (or select a track to infer its album)'); return; }
      const response = await fetch('/api/presave/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ albumId: target })
      });
      const data = await response.json();
      setJsonOutput(data);
      log('PRESAVE_ALBUM', target, data.status || 'COMPLETED');
      if (data.success) awardOnce(`presave_album:${target}`);
      setMission7Status(data.success ? 'SUCCESS: Album saved (pre-save)' : 'FAILED: Could not pre-save album');
      await fetchCompletions();
    } catch (error) {
      log('PRESAVE_ALBUM', albumId || albumFromTrack?.id || '', 'ERROR');
      setMission7Status('ERROR: Request failed while pre-saving album');
      await fetchCompletions();
    }
  };

  // Mission 8: Follow Artist
  const followArtist = async () => {
    if (!artist?.id) { setMission8Status('Please select or search a track first to identify the artist'); return; }
    try {
      const response = await fetch('/api/me/following/artist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistId: artist.id })
      });
      const data = await response.json();
      setJsonOutput(data);
      log('FOLLOW_ARTIST', artist.id, data.success ? 'SUCCESS' : 'FAILED');
      if (data.success) awardOnce(`follow_artist:${artist.id}`);
      setMission8Status(data.success ? 'SUCCESS: Artist followed' : 'FAILED: Could not follow artist');
      await fetchCompletions();
    } catch (error) {
      log('FOLLOW_ARTIST', artist?.id || '', 'ERROR');
      setMission8Status('ERROR: Request failed while following artist');
      await fetchCompletions();
    }
  };

  // Mission 3-1: Quiz verify (album contains TKO)
  const verifyQuizTKO = async () => {
    try {
      const res = await fetch('/api/missions/quiz/tko/verify');
      const data = await res.json();
      setJsonOutput(data);
      if (res.ok) {
        const ok = !!data.saved;
        setQuizAlbumStatus(ok ? 'SUCCESS: Album is saved in your library' : 'FAILED: Album not saved yet');
        log('QUIZ_ALBUM_TKO', QUIZ_TKO_ALBUM_ID, ok ? 'SUCCESS' : 'FAILED');
        if (ok) awardOnce(`quiz_album_tko:${QUIZ_TKO_ALBUM_ID}`);
      } else {
        setQuizAlbumStatus('ERROR: Verification failed');
        log('QUIZ_ALBUM_TKO', QUIZ_TKO_ALBUM_ID, 'FAILED');
      }
      await fetchCompletions();
    } catch (e) {
      setQuizAlbumStatus('ERROR: Request failed');
      log('QUIZ_ALBUM_TKO', QUIZ_TKO_ALBUM_ID, 'ERROR');
      await fetchCompletions();
    }
  };

  // Mission 2-1: Follow Official Spotify's IVE Playlist (public)
  const followOfficialPlaylist = async () => {
    try {
      const res = await fetch(`/api/playlists/${OFFICIAL_IVE_PLAYLIST_ID}/follow`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public: true })
      });
      const data = await res.json();
      setJsonOutput(data);
      if (res.ok) {
        const ok = !!data.followed;
        setMissionFollowPlaylistStatus(ok ? "SUCCESS: Followed IVE playlist" : "FAILED: Could not verify follow");
        if (ok) awardOnce(`follow_playlist:${OFFICIAL_IVE_PLAYLIST_ID}`);
      } else {
        setMissionFollowPlaylistStatus('ERROR: Follow request failed');
      }
      await fetchCompletions();
    } catch (e) {
      setMissionFollowPlaylistStatus('ERROR: Network or server error');
      await fetchCompletions();
    }
  };

  // Mission 1-1: Quiz play LOVE DIVE within window
  const verifyQuizTKOTrack = async () => {
    try {
      const res = await fetch('/api/missions/quiz/tko-track/verify');
      const data = await res.json();
      setJsonOutput(data);
      if (res.ok) {
        const ok = !!data.played;
        setQuizTrackStatus(ok ? 'SUCCESS: Track played within 10 minutes' : 'FAILED: Not found in last 10 minutes');
        log('QUIZ_TRACK_TKO', QUIZ_TKO_TRACK_ID, ok ? 'SUCCESS' : 'FAILED');
        if (ok) awardOnce(`quiz_track_tko:${QUIZ_TKO_TRACK_ID}`);
      } else {
        setQuizTrackStatus('ERROR: Verification failed');
        log('QUIZ_TRACK_TKO', QUIZ_TKO_TRACK_ID, 'FAILED');
      }
      await fetchCompletions();
    } catch (e) {
      setQuizTrackStatus('ERROR: Request failed');
      log('QUIZ_TRACK_TKO', QUIZ_TKO_TRACK_ID, 'ERROR');
      await fetchCompletions();
    }
  };

  // Mission 9: Save Show/Episode
  const saveShow = async () => {
    if (!showId) {
      alert('Enter a show ID');
      return;
    }
    try {
      const response = await fetch('/api/me/shows', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showId })
      });
      const data = await response.json();
      setJsonOutput(data);
      log('SAVE_SHOW', showId, data.success ? 'SUCCESS' : 'FAILED');
      await fetchCompletions();
    } catch (error) {
      log('SAVE_SHOW', showId, 'ERROR');
      await fetchCompletions();
    }
  };

  const saveEpisode = async () => {
    if (!episodeId) {
      alert('Enter an episode ID');
      return;
    }
    try {
      const response = await fetch('/api/me/episodes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episodeId })
      });
      const data = await response.json();
      setJsonOutput(data);
      log('SAVE_EPISODE', episodeId, data.success ? 'SUCCESS' : 'FAILED');
      await fetchCompletions();
    } catch (error) {
      log('SAVE_EPISODE', episodeId, 'ERROR');
      await fetchCompletions();
    }
  };

  return (
    <>
      <header>
        <h1>Spotify Mission MVP</h1>
        <div className="row">
          <div className="row" style={{ gap: 8 }}>
            <div
              title="Local score (device only)"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 10px', border: '1px solid #e9e9e9',
                borderRadius: 20,
                background: scorePulse ? '#f0fff5' : '#fff',
                boxShadow: scorePulse ? '0 0 0 3px rgba(29,185,84,0.15)' : 'none',
                transform: scorePulse ? 'scale(1.04)' : 'scale(1)',
                transition: 'transform 180ms ease, background 180ms ease, box-shadow 180ms ease'
              }}
            >
              <span role="img" aria-label="trophy">🏆</span>
              <span style={{ fontWeight: 600 }}>score: {score}</span>
              <button onClick={resetScore} style={{ padding: '2px 8px', fontSize: 12 }}>Reset</button>
            </div>
            <a href="/api/auth/spotify/login">
              <button className="primary">Connect Spotify</button>
            </a>
          </div>
        </div>
      </header>

      <main>
        <section>
          <div className="row">
            <div>
              <div className="label">Idol</div>
              <input 
                placeholder="e.g., aespa"
                value={idol}
                onChange={(e) => setIdol(e.target.value)}
              />
            </div>
            <div>
              <div className="label">Release (optional name)</div>
              <input 
                placeholder="e.g., Supernova"
                value={release}
                onChange={(e) => setRelease(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="label" style={{ visibility: 'hidden' }}>Action</div>
              <button onClick={handleSearch} disabled={loading}>
                {loading ? 'Searching...' : 'Test Search'}
              </button>
            </div>
            {/* Set Target no longer needed; selection is immediate */}
          </div>
          {/* Selected Targets summary */}
          <div style={{ marginTop: '12px', padding: '12px', border: '1px solid #eee', borderRadius: 8 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Selected Targets</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {selectedTrackInfo?.image ? (
                  <img src={selectedTrackInfo.image} alt="track cover" width={56} height={56} style={{ borderRadius: 6, objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 56, height: 56, background: '#eee', borderRadius: 6 }} />
                )}
                <div>
                  <div style={{ fontWeight: 600 }}>Track</div>
                  <div style={{ color: '#333' }}>{selectedTrackInfo ? `${selectedTrackInfo.name} — ${selectedTrackInfo.artists?.join(', ')}` : '(none selected)'}</div>
                  {trackId && <div style={{ color: '#777', fontSize: 12 }}>ID: {trackId}</div>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {selectedAlbumInfo?.image ? (
                  <img src={selectedAlbumInfo.image} alt="album cover" width={56} height={56} style={{ borderRadius: 6, objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 56, height: 56, background: '#eee', borderRadius: 6 }} />
                )}
                <div>
                  <div style={{ fontWeight: 600 }}>Album</div>
                  <div style={{ color: '#333' }}>
                    {selectedAlbumInfo
                      ? `${selectedAlbumInfo.name} — ${selectedAlbumInfo.artists?.join(', ')}`
                      : (albumFromTrack ? `${albumFromTrack.name} (from track)` : '(none selected)')}
                  </div>
                  {(albumId || albumFromTrack?.id) && <div style={{ color: '#777', fontSize: 12 }}>ID: {albumId || albumFromTrack?.id}</div>}
                </div>
              </div>
            </div>
          </div>

          {/* Search Results cards */}
          {searchResults && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Tracks */}
                <div>
                  <div className="label" style={{ marginBottom: 8 }}>Tracks (click to select)</div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {(searchResults.tracks || []).map((t: any) => {
                      const selected = t.id === trackId;
                      return (
                        <button key={t.id} onClick={() => selectTrack(t)} style={{
                          textAlign: 'left',
                          display: 'grid',
                          gridTemplateColumns: '64px 1fr 96px',
                          gap: 12,
                          padding: 8,
                          borderRadius: 8,
                          border: selected ? '2px solid #1DB954' : '1px solid #eee',
                          background: selected ? '#f0fff5' : '#fff',
                          cursor: 'pointer'
                        }}>
                          {t.image ? <img src={t.image} alt="cover" width={64} height={64} style={{ borderRadius: 6, objectFit: 'cover' }} /> : <div style={{ width: 64, height: 64, background: '#eee', borderRadius: 6 }} />}
                          <div>
                            <div style={{ fontWeight: 600 }}>{t.name}</div>
                            <div style={{ color: '#555' }}>{t.artists?.join(', ')}</div>
                            {t.release_date && <div style={{ color: '#999', fontSize: 12 }}>{t.release_date}</div>}
                            {selected && <div style={{ color: '#1DB954', fontSize: 12, fontWeight: 600 }}>Selected ✓</div>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                            <span style={{ fontSize: 12, color: '#777' }}>{t.id.slice(0, 6)}...</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Albums */}
                <div>
                  <div className="label" style={{ marginBottom: 8 }}>Albums (click to select)</div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {(searchResults.albums || []).map((a: any) => {
                      const selected = a.id === albumId;
                      return (
                        <button key={a.id} onClick={() => selectAlbum(a)} style={{
                          textAlign: 'left',
                          display: 'grid',
                          gridTemplateColumns: '64px 1fr 96px',
                          gap: 12,
                          padding: 8,
                          borderRadius: 8,
                          border: selected ? '2px solid #1DB954' : '1px solid #eee',
                          background: selected ? '#f0fff5' : '#fff',
                          cursor: 'pointer'
                        }}>
                          {a.image ? <img src={a.image} alt="album" width={64} height={64} style={{ borderRadius: 6, objectFit: 'cover' }} /> : <div style={{ width: 64, height: 64, background: '#eee', borderRadius: 6 }} />}
                          <div>
                            <div style={{ fontWeight: 600 }}>{a.name}</div>
                            <div style={{ color: '#555' }}>{a.artists?.join(', ')}</div>
                            {a.release_date && <div style={{ color: '#999', fontSize: 12 }}>{a.release_date}</div>}
                            {selected && <div style={{ color: '#1DB954', fontSize: 12, fontWeight: 600 }}>Selected ✓</div>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                            <span style={{ fontSize: 12, color: '#777' }}>{a.id.slice(0, 6)}...</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Removed direct ID inputs; selection handled via cards above */}
        </section>

        <section>
          <h3 style={{ margin: '0 0 8px 0' }}>Active Missions</h3>
          
          {/* First Row */}
          <div className="grid" style={{ marginBottom: '12px' }}>
            {/* Mission 1: Play Verification */}
            <div>
              <strong>1) Play Verification</strong><br/>
              <span className="label">Window: last 10 minutes</span><br/><br/>
              <button onClick={verifyPlay}>Verify Recently Played</button>
              {mission1Status && (
                <div style={{ marginTop: '6px', padding: '6px 8px', borderRadius: 6, background: mission1Status.startsWith('SUCCESS') ? '#e8f7ee' : (mission1Status.startsWith('FAILED') ? '#fdecea' : '#fff3cd'), color: '#333' }}>
                  {mission1Status}
                </div>
              )}
            </div>

            {/* Mission 1-1: Quiz: Play TKO */}
            <div>
              <strong>1-1) Quiz: Play IVE's debut track and verify</strong><br/>
              <span className="label">Play the track in Spotify within the last 10 minutes</span><br/><br/>
              <div className="row" style={{ margin: '6px 0' }}>
                <a href={`https://open.spotify.com/track/${QUIZ_TKO_TRACK_ID}`} target="_blank" rel="noreferrer">
                  <button>Open Track</button>
                </a>
                <button onClick={verifyQuizTKOTrack}>Verify</button>
              </div>
              {quizTrackStatus && (
                <div style={{ marginTop: '6px', padding: '6px 8px', borderRadius: 6, background: quizTrackStatus.startsWith('SUCCESS') ? '#e8f7ee' : (quizTrackStatus.startsWith('FAILED') ? '#fdecea' : '#fff3cd'), color: '#333' }}>
                  {quizTrackStatus}
                </div>
              )}
            </div>

            {/* Mission 2: Add to Playlist */}
            <div>
              <strong>2) Add to Playlist</strong><br/>
              <div className="row" style={{ margin: '6px 0' }}>
                <button onClick={listPlaylists}>Get My Playlists</button>
                <select 
                  value={selectedPlaylist}
                  onChange={(e) => setSelectedPlaylist(e.target.value)}
                  style={{ maxWidth: '180px' }}
                >
                  <option value="">(select playlist)</option>
                  {playlists.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <input
                  placeholder="New playlist name"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  style={{ maxWidth: '200px' }}
                />
                <button onClick={createPlaylist}>Create</button>
              </div>
              <button onClick={addToPlaylist}>Add Target Track</button>
              {mission2Status && (
                <div style={{ marginTop: '6px', padding: '6px 8px', borderRadius: 6, background: mission2Status.startsWith('SUCCESS') ? '#e8f7ee' : (mission2Status.startsWith('FAILED') ? '#fdecea' : '#fff3cd'), color: '#333' }}>
                  {mission2Status}
                </div>
              )}
            </div>

            {/* Mission 2-1: Follow Official Spotify's IVE Playlist */}
            <div>
              <strong>2-1) Follow Official Spotify's IVE Playlist</strong><br/>
              <div className="row" style={{ margin: '6px 0' }}>
                <button onClick={followOfficialPlaylist}>Follow</button>
              </div>
              {missionFollowPlaylistStatus && (
                <div style={{ marginTop: '6px', padding: '6px 8px', borderRadius: 6, background: missionFollowPlaylistStatus.startsWith('SUCCESS') ? '#e8f7ee' : (missionFollowPlaylistStatus.startsWith('FAILED') ? '#fdecea' : '#fff3cd'), color: '#333' }}>
                  {missionFollowPlaylistStatus}
                </div>
              )}
            </div>

            {/* Mission 3: Add Album in Library */}
            <div>
              <strong>3) Add Album in Library</strong><br/>
              <span className="label">Uses Target Album ID (or album from track)</span><br/><br/>
              <button onClick={saveAlbum}>Add Album</button>
              {mission3Status && (
                <div style={{ marginTop: '6px', padding: '6px 8px', borderRadius: 6, background: mission3Status.startsWith('SUCCESS') ? '#e8f7ee' : (mission3Status.startsWith('FAILED') ? '#fdecea' : '#fff3cd'), color: '#333' }}>
                  {mission3Status}
                </div>
              )}
            </div>
          </div>

          {/* Second Row */}
          <div className="grid" style={{ marginBottom: '12px' }}>
            {/* Mission 3-1: Quiz */}
            <div>
              <strong>3-1) Quiz: Which album contains “TKO”?</strong><br/>
              <span className="label">Add IVE EMPATHY in your Spotify app, then verify</span><br/><br/>
              <div className="row" style={{ margin: '6px 0' }}>
                <a href={`https://open.spotify.com/album/${QUIZ_TKO_ALBUM_ID}`} target="_blank" rel="noreferrer">
                  <button>Open Album</button>
                </a>
                <button onClick={verifyQuizTKO}>Verify</button>
              </div>
              {quizAlbumStatus && (
                <div style={{ marginTop: '6px', padding: '6px 8px', borderRadius: 6, background: quizAlbumStatus.startsWith('SUCCESS') ? '#e8f7ee' : (quizAlbumStatus.startsWith('FAILED') ? '#fdecea' : '#fff3cd'), color: '#333' }}>
                  {quizAlbumStatus}
                </div>
              )}
            </div>
            {/* Mission 4: Pin to Top */}
            <div>
              <strong>4) Pin Track to Top</strong><br/>
              <span className="label">Move track to position 1</span><br/><br/>
              <button onClick={pinToTop}>Pin to Top of Playlist</button>
              {mission4Status && (
                <div style={{ marginTop: '6px', padding: '6px 8px', borderRadius: 6, background: mission4Status.startsWith('SUCCESS') ? '#e8f7ee' : (mission4Status.startsWith('FAILED') ? '#fdecea' : '#fff3cd'), color: '#333' }}>
                  {mission4Status}
                </div>
              )}
            </div>

            {/* Mission 5: Save Track in Library */}
            <div>
              <strong>5) Save Track in Library</strong><br/>
              <div className="row" style={{ margin: '6px 0' }}>
                <button onClick={saveTrack}>Save Track</button>
              </div>
              {mission5Status && (
                <div style={{ marginTop: '6px', padding: '6px 8px', borderRadius: 6, background: mission5Status.startsWith('SUCCESS') ? '#e8f7ee' : (mission5Status.startsWith('FAILED') ? '#fdecea' : '#fff3cd'), color: '#333' }}>
                  {mission5Status}
                </div>
              )}
            </div>

            {/* Mission 6: Apply Cover */}
            <div>
              <strong>6) Apply Official Cover</strong><br/>
              <div className="row" style={{ margin: '6px 0' }}>
                <button onClick={loadOfficialCover}>Load Cover</button>
                <button onClick={applyCover}>Apply to Playlist</button>
              </div>
              {mission6Status && (
                <div style={{ marginTop: '6px', padding: '6px 8px', borderRadius: 6, background: mission6Status.startsWith('SUCCESS') ? '#e8f7ee' : (mission6Status.startsWith('FAILED') ? '#fdecea' : '#fff3cd'), color: '#333' }}>
                  {mission6Status}
                </div>
              )}
            </div>

          </div>

          {/* Third Row */}
          <div className="grid">
            {/* Mission 7: Pre-save */}
            <div>
              <strong>7) Pre-save Album (Dev)</strong><br/>
              <span className="label">Simulated pre-release save</span><br/><br/>
              <button onClick={presaveAlbum}>Pre-save Album</button>
              {mission7Status && (
                <div style={{ marginTop: '6px', padding: '6px 8px', borderRadius: 6, background: mission7Status.startsWith('SUCCESS') ? '#e8f7ee' : (mission7Status.startsWith('FAILED') ? '#fdecea' : '#fff3cd'), color: '#333' }}>
                  {mission7Status}
                </div>
              )}
            </div>

            {/* Mission 8: Follow Artist */}
            <div>
              <strong>8) Follow Artist</strong><br/>
              <span className="label">
                {artist ? `Artist: ${artist.name}` : 'Search track first'}
              </span><br/><br/>
              <button onClick={followArtist}>
                Follow {artist?.name || 'Artist'}
              </button>
              {mission8Status && (
                <div style={{ marginTop: '6px', padding: '6px 8px', borderRadius: 6, background: mission8Status.startsWith('SUCCESS') ? '#e8f7ee' : (mission8Status.startsWith('FAILED') ? '#fdecea' : '#fff3cd'), color: '#333' }}>
                  {mission8Status}
                </div>
              )}
            </div>
            {/* Mission 9: Save Show/Episode (hidden when FEATURE_PODCASTS === -1) */}
            {!hidePodcasts && (
              <div>
                <strong>9) Save Show/Episode</strong><br/>
                <div style={{ margin: '6px 0' }}>
                  <input 
                    placeholder="Show ID"
                    value={showId}
                    onChange={(e) => setShowId(e.target.value)}
                    style={{ width: '100%', marginBottom: '4px' }}
                    disabled={disablePodcasts}
                  />
                  <input 
                    placeholder="Episode ID"
                    value={episodeId}
                    onChange={(e) => setEpisodeId(e.target.value)}
                    style={{ width: '100%', marginBottom: '4px' }}
                    disabled={disablePodcasts}
                  />
                </div>
                <div className="row">
                  <button onClick={saveShow} disabled={disablePodcasts}>Save Show</button>
                  <button onClick={saveEpisode} disabled={disablePodcasts}>Save Episode</button>
                </div>
              </div>
            )}

            {/* Empty cell for alignment */}
            <div></div>
          </div>
        </section>

        <section>
          <h3 style={{ margin: '0 0 8px 0' }}>Raw JSON Console</h3>
          <pre>{JSON.stringify(jsonOutput, null, 2)}</pre>
        </section>

        <section>
          <h3 style={{ margin: '0 0 8px 0' }}>Completions Log</h3>
          <table>
            <thead>
              <tr>
                <th>time</th>
                <th>mission</th>
                <th>target_id</th>
                <th>status</th>
              </tr>
            </thead>
            <tbody>
              {completions.slice(0, 10).map((c, i) => (
                <tr key={i}>
                  <td>{c.time}</td>
                  <td>{c.mission}</td>
                  <td>{c.target}</td>
                  <td>{c.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}
