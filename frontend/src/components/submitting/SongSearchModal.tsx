import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import { SoundCloudTrack } from '../../types';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import AutorenewIcon from '@mui/icons-material/Autorenew';

interface SongSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTrack: (track: SoundCloudTrack) => void;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

interface TrackItemProps {
  track: SoundCloudTrack;
  onSelect: (track: SoundCloudTrack) => void;
}

const TrackItem = memo(function TrackItem({ track, onSelect }: TrackItemProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(track)}
      className="w-full p-3 flex items-center gap-3 hover:bg-white/10 transition-colors text-left border-b border-white/5 last:border-b-0"
    >
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
        {track.artwork_url ? (
          <img
            src={track.artwork_url.replace('-large', '-t200x200')}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MusicNoteIcon className="text-gray-500" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium truncate text-sm">{track.title}</p>
        <p className="text-gray-400 text-xs truncate">{track.user.username}</p>
      </div>
      <div className="text-purple-400 text-xs flex-shrink-0">
        {formatDuration(track.duration)}
      </div>
    </button>
  );
});

export function SongSearchModal({ isOpen, onClose, onSelectTrack }: SongSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SoundCloudTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(query, 400);

  // Handle visibility with CSS transition
  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Search tracks
  const searchTracks = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `http://localhost:3000/api/soundcloud/search?q=${encodeURIComponent(searchQuery)}&limit=15`
      );

      if (response.status === 429) {
        setError('Rate limited. Please wait a moment and try again.');
        setResults([]);
        return;
      }

      if (!response.ok) throw new Error('Failed to search tracks');

      const data = await response.json();
      setResults(data.tracks || []);
    } catch {
      setError('Failed to search. Please try again.');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    searchTracks(debouncedQuery);
  }, [debouncedQuery, searchTracks]);

  const handleSelectTrack = useCallback((track: SoundCloudTrack) => {
    onSelectTrack(track);
    setQuery('');
    setResults([]);
    onClose();
  }, [onSelectTrack, onClose]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen && !visible) return null;

  const modalContent = (
    <div
      className={`fixed inset-0 z-[100] flex items-start justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-150 ${visible && isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-2xl mx-4 mt-16 sm:mt-24 bg-gray-900/95 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden transition-all duration-200 ${visible && isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <SearchIcon sx={{ fontSize: 20 }} className="text-purple-400" />
            Search Songs
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <CloseIcon sx={{ fontSize: 20 }} />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-white/10">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search SoundCloud..."
              className="w-full px-4 py-3 pl-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              {isLoading ? (
                <AutorenewIcon sx={{ fontSize: 20 }} className="animate-spin" />
              ) : (
                <SearchIcon sx={{ fontSize: 20 }} />
              )}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="p-4 text-red-400 text-center text-sm">{error}</div>
          )}

          {isLoading && results.length === 0 && (
            <div className="p-8 text-gray-400 text-center text-sm">Searching...</div>
          )}

          {!isLoading && !error && results.length === 0 && query.trim() && (
            <div className="p-8 text-gray-400 text-center text-sm">No tracks found. Try a different search.</div>
          )}

          {!query.trim() && results.length === 0 && (
            <div className="p-8 text-gray-500 text-center">
              <MusicNoteIcon sx={{ fontSize: 48 }} className="mb-2 opacity-50" />
              <p className="text-sm">Start typing to search for songs</p>
            </div>
          )}

          {results.map((track) => (
            <TrackItem key={track.id} track={track} onSelect={handleSelectTrack} />
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 flex items-center justify-center gap-2 text-xs text-gray-500">
          <span>Powered by</span>
          <a
            href="https://soundcloud.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-400 hover:text-orange-300 transition-colors"
          >
            SoundCloud
          </a>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
