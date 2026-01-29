import { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Song } from '../../types';

interface SoundCloudPlayerProps {
  song: Song | null;
  autoPlay?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onFinish?: () => void;
  onProgress?: (position: number, duration: number) => void;
}

// SoundCloud Widget API types
interface SCWidget {
  bind: (event: string, callback: () => void) => void;
  unbind: (event: string) => void;
  load: (url: string, options?: { auto_play?: boolean; show_artwork?: boolean }) => void;
  play: () => void;
  pause: () => void;
  seekTo: (milliseconds: number) => void;
  getPosition: (callback: (position: number) => void) => void;
  getDuration: (callback: (duration: number) => void) => void;
}

interface SCWidgetAPI {
  Widget: new (iframe: HTMLIFrameElement) => SCWidget;
  Events: {
    READY: string;
    PLAY: string;
    PAUSE: string;
    FINISH: string;
    PLAY_PROGRESS: string;
    ERROR: string;
  };
}

declare global {
  interface Window {
    SC?: SCWidgetAPI;
  }
}

export function SoundCloudPlayer({
  song,
  autoPlay = true,
  onPlay,
  onPause,
  onFinish,
  onProgress,
}: SoundCloudPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const widgetRef = useRef<SCWidget | null>(null);
  const scriptLoadedRef = useRef(false);

  // Load SoundCloud Widget API script
  const loadSCScript = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      if (window.SC) {
        resolve();
        return;
      }

      if (scriptLoadedRef.current) {
        // Script is loading, wait for it
        const checkInterval = setInterval(() => {
          if (window.SC) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        return;
      }

      scriptLoadedRef.current = true;
      const script = document.createElement('script');
      script.src = 'https://w.soundcloud.com/player/api.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load SoundCloud Widget API'));
      document.body.appendChild(script);
    });
  }, []);

  // Initialize widget when iframe is ready
  useEffect(() => {
    if (!iframeRef.current || !song) return;

    const initWidget = async () => {
      try {
        await loadSCScript();
        
        if (!window.SC || !iframeRef.current) return;

        const widget = new window.SC.Widget(iframeRef.current);
        widgetRef.current = widget;

        // Bind events
        widget.bind(window.SC.Events.READY, () => {
          if (autoPlay) {
            widget.play();
          }
        });

        widget.bind(window.SC.Events.PLAY, () => {
          onPlay?.();
        });

        widget.bind(window.SC.Events.PAUSE, () => {
          onPause?.();
        });

        widget.bind(window.SC.Events.FINISH, () => {
          onFinish?.();
        });

        widget.bind(window.SC.Events.PLAY_PROGRESS, () => {
          widget.getPosition((position) => {
            widget.getDuration((duration) => {
              onProgress?.(position, duration);
            });
          });
        });

      } catch (error) {
        console.error('Failed to initialize SoundCloud widget:', error);
      }
    };

    initWidget();

    return () => {
      if (widgetRef.current && window.SC) {
        widgetRef.current.unbind(window.SC.Events.READY);
        widgetRef.current.unbind(window.SC.Events.PLAY);
        widgetRef.current.unbind(window.SC.Events.PAUSE);
        widgetRef.current.unbind(window.SC.Events.FINISH);
        widgetRef.current.unbind(window.SC.Events.PLAY_PROGRESS);
      }
    };
  }, [song, autoPlay, loadSCScript, onPlay, onPause, onFinish, onProgress]);

  if (!song) {
    return (
      <div className="p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10">
        <div className="flex items-center justify-center py-8">
          <p className="text-gray-400">No song selected</p>
        </div>
      </div>
    );
  }

  // Build SoundCloud embed URL
  const embedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(song.permalinkUrl)}&color=%239333ea&auto_play=${autoPlay}&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=true`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden bg-white/5 backdrop-blur-md border border-white/10"
    >
      {/* SoundCloud Widget iframe */}
      <div className="relative">
        <iframe
          ref={iframeRef}
          width="100%"
          height="166"
          scrolling="no"
          frameBorder="no"
          allow="autoplay"
          src={embedUrl}
          title={`SoundCloud Player - ${song.title}`}
          className="w-full"
        />
      </div>

      {/* SoundCloud Attribution */}
      <div className="px-4 py-3 bg-black/20 border-t border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-orange-500"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.009-.06-.052-.1-.084-.1zm-.899.828c-.06 0-.091.037-.104.094L0 14.479l.165 1.308c.014.057.045.094.09.094s.089-.037.099-.094l.19-1.308-.19-1.332c-.01-.057-.044-.094-.078-.094zm1.83-1.229c-.061 0-.12.045-.12.104l-.21 2.563.225 2.458c0 .06.045.104.106.104.061 0 .12-.044.12-.104l.24-2.458-.24-2.563c0-.06-.059-.104-.121-.104zm.945-.089c-.075 0-.135.06-.15.135l-.193 2.64.21 2.544c.016.077.075.138.149.138.075 0 .135-.061.15-.138l.225-2.544-.225-2.64c-.015-.075-.06-.135-.166-.135zm.964-.089c-.09 0-.165.075-.165.165l-.195 2.729.195 2.61c0 .09.075.165.165.165.091 0 .165-.075.165-.165l.225-2.61-.225-2.729c0-.09-.074-.165-.165-.165zm1.02-.089c-.104 0-.18.075-.195.18l-.18 2.819.18 2.67c.015.104.09.18.195.18.104 0 .18-.076.18-.18l.21-2.67-.21-2.819c0-.105-.076-.18-.18-.18zm1.05-.09c-.12 0-.21.09-.225.21l-.165 2.909.165 2.73c.015.12.105.21.225.21.12 0 .21-.09.21-.21l.195-2.73-.195-2.909c-.015-.12-.09-.21-.21-.21zm1.065-.089c-.135 0-.24.105-.24.24l-.15 2.999.15 2.789c0 .135.105.24.24.24.135 0 .24-.105.24-.24l.165-2.789-.165-2.999c0-.135-.105-.24-.24-.24zm1.08-.09c-.15 0-.255.105-.27.255l-.135 3.089.135 2.849c.015.15.12.255.27.255.15 0 .255-.105.255-.255l.15-2.849-.15-3.089c-.015-.15-.105-.255-.255-.255zm1.095-.089c-.165 0-.285.12-.285.285l-.12 3.179.12 2.909c0 .165.12.285.285.285.165 0 .285-.12.285-.285l.135-2.909-.135-3.179c0-.165-.12-.285-.285-.285zm1.11-.09c-.18 0-.315.135-.315.315l-.105 3.269.105 2.969c0 .18.135.315.315.315.18 0 .315-.135.315-.315l.12-2.969-.12-3.269c0-.18-.135-.315-.315-.315zm1.125-.089c-.195 0-.345.15-.345.345l-.09 3.359.09 3.029c0 .195.15.345.345.345.195 0 .345-.15.345-.345l.105-3.029-.105-3.359c0-.195-.15-.345-.345-.345zm1.14-.09c-.21 0-.375.165-.375.375l-.075 3.449.075 3.089c0 .21.165.375.375.375.21 0 .375-.165.375-.375l.09-3.089-.09-3.449c0-.21-.165-.375-.375-.375zm1.155-.089c-.225 0-.405.18-.405.405l-.06 3.539.06 3.149c0 .225.18.405.405.405.225 0 .405-.18.405-.405l.075-3.149-.075-3.539c0-.225-.18-.405-.405-.405zm1.17-.09c-.24 0-.435.195-.435.435l-.045 3.629.045 3.209c0 .24.195.435.435.435.24 0 .435-.195.435-.435l.06-3.209-.06-3.629c0-.24-.195-.435-.435-.435zm1.185-.089c-.255 0-.465.21-.465.465l-.03 3.719.03 3.269c0 .255.21.465.465.465.255 0 .465-.21.465-.465l.045-3.269-.045-3.719c0-.255-.21-.465-.465-.465zm1.2-.09c-.27 0-.495.225-.495.495l-.015 3.809.015 3.329c0 .27.225.495.495.495.27 0 .495-.225.495-.495l.03-3.329-.03-3.809c0-.27-.225-.495-.495-.495zm1.215-.089c-.285 0-.525.24-.525.525v3.899l.015 3.389c0 .285.24.525.525.525.285 0 .525-.24.525-.525l.015-3.389-.015-3.899c0-.285-.24-.525-.525-.525zm1.23-.09c-.3 0-.555.255-.555.555v3.989l.015 3.449c0 .3.255.555.555.555.3 0 .555-.255.555-.555l.015-3.449-.015-3.989c0-.3-.255-.555-.555-.555zm1.245-.089c-.315 0-.585.27-.585.585v4.079l.015 3.509c0 .315.27.585.585.585.315 0 .585-.27.585-.585l.015-3.509-.015-4.079c0-.315-.27-.585-.585-.585zm1.26-.09c-.33 0-.615.285-.615.615v4.169l.015 3.569c0 .33.285.615.615.615.33 0 .615-.285.615-.615l.015-3.569-.015-4.169c0-.33-.285-.615-.615-.615z" />
            </svg>
            <span className="text-xs text-gray-400">
              Powered by SoundCloud
            </span>
          </div>
          
          <a
            href={song.permalinkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
          >
            View on SoundCloud →
          </a>
        </div>
      </div>
    </motion.div>
  );
}
