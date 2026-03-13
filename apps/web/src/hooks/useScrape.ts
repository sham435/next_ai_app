'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  ScrapeResponse,
  ScrapeProgressEvent,
  ScrapeCompleteEvent,
  ScrapeStage,
} from '@scrape-platform/shared-types';

const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      const protocol = window.location.protocol;
      return `${protocol}//api-production-171d.up.railway.app`;
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
};

const API_URL = getApiUrl();

export type ScrapeStatus = 'idle' | 'connecting' | 'scraping' | 'complete' | 'error';

interface ScrapeState {
  status: ScrapeStatus;
  progress: number;
  stage: ScrapeStage | null;
  message: string | null;
  result: ScrapeCompleteEvent | null;
  error: string | null;
}

export function useScrape() {
  const [state, setState] = useState<ScrapeState>({
    status: 'idle',
    progress: 0,
    stage: null,
    message: null,
    result: null,
    error: null,
  });

  const socketRef = useRef<Socket | null>(null);

  const cleanup = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const start = useCallback(
    async (url: string) => {
      cleanup();

      setState({
        status: 'connecting',
        progress: 0,
        stage: 'queued',
        message: 'Connecting to server...',
        result: null,
        error: null,
      });

      try {
        const socket = io(API_URL, {
          transports: ['polling', 'websocket'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          timeout: 20000,
          withCredentials: true,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
          setState((prev) => ({
            ...prev,
            status: 'scraping',
            message: 'Connected. Starting scrape...',
          }));

          socket.emit('startScrape', { url }, (response: ScrapeResponse) => {
            if (!response.success) {
              setState((prev) => ({
                ...prev,
                status: 'error',
                error: response.error || 'Failed to start scrape job',
              }));
              cleanup();
            }
          });
        });

        socket.onAny((event: string, data: ScrapeProgressEvent | ScrapeCompleteEvent) => {
          if (event.startsWith('progress:')) {
            const progressData = data as ScrapeProgressEvent;
            setState((prev) => ({
              ...prev,
              progress: progressData.progress,
              stage: progressData.stage,
              message: progressData.message || `Stage: ${progressData.stage}`,
            }));
          }

          if (event.startsWith('complete:')) {
            const completeData = data as ScrapeCompleteEvent;
            setState({
              status: completeData.success ? 'complete' : 'error',
              progress: 100,
              stage: completeData.success ? 'complete' : 'failed',
              message: completeData.success
                ? `Found ${completeData.filesFound} files in ${completeData.duration}ms`
                : completeData.error || 'Scrape failed',
              result: completeData,
              error: completeData.success ? null : completeData.error || 'Scrape failed',
            });
            cleanup();
          }
        });

        socket.on('connect_error', (err) => {
          setState((prev) => ({
            ...prev,
            status: 'error',
            error: `Connection failed: ${err.message}`,
          }));
          cleanup();
        });
      } catch (err) {
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        }));
        cleanup();
      }
    },
    [cleanup],
  );

  const reset = useCallback(() => {
    cleanup();
    setState({
      status: 'idle',
      progress: 0,
      stage: null,
      message: null,
      result: null,
      error: null,
    });
  }, [cleanup]);

  return { ...state, start, reset };
}
