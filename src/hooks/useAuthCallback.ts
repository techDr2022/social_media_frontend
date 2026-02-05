/**
 * useAuthCallback Hook
 * 
 * Handles magic link callback authentication flow
 * 
 * Architecture:
 * - Event-driven (no polling)
 * - Delegates to AuthProvider for state management
 * - Handles redirects and error states
 * - Single responsibility: callback handling
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabaseclient';

type CallbackState = 
  | 'idle'
  | 'processing'
  | 'success'
  | 'error'
  | 'timeout';

interface UseAuthCallbackReturn {
  state: CallbackState;
  error: string | null;
  isProcessing: boolean;
}

const CALLBACK_TIMEOUT = 10000; // 10 seconds

export function useAuthCallback(): UseAuthCallbackReturn {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [state, setState] = useState<CallbackState>('idle');
  const [error, setError] = useState<string | null>(null);
  const hasProcessedRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Prevent multiple processing attempts
    if (hasProcessedRef.current) return;

    // Wait for AuthProvider to initialize
    if (authLoading) {
      setState('processing');
      return;
    }

    // Google OAuth uses query parameters (?code=...), Magic links use hash fragments (#access_token=...)
    // Check both!
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash.substring(1);
    const hashParams = hash ? new URLSearchParams(hash) : null;

    // Check for OAuth code (Google OAuth)
    const oauthCode = urlParams.get('code');
    const oauthError = urlParams.get('error') || hashParams?.get('error');
    const errorDescription = urlParams.get('error_description') || hashParams?.get('error_description');

    // Check for error in URL (query params or hash)
    if (oauthError) {
      hasProcessedRef.current = true;
      setState('error');
      setError(errorDescription || oauthError);
      
      // Clear URL parameters/hash immediately for security
      window.history.replaceState(null, '', window.location.pathname);
      
      // Redirect after showing error
      timeoutRef.current = setTimeout(() => {
        router.push('/login');
      }, 3000);
      return;
    }

    // If we have OAuth code, Supabase will process it automatically
    // If we have hash with access_token, Supabase will process it automatically
    const hasAuthData = oauthCode || hashParams?.get('access_token');
    
    if (!hasAuthData && !session) {
      // No auth data and no session - might be direct navigation to callback page
      hasProcessedRef.current = true;
      setState('error');
      setError('No authentication data found');
      
      window.history.replaceState(null, '', window.location.pathname);
      
      timeoutRef.current = setTimeout(() => {
        router.push('/login');
      }, 2000);
      return;
    }

    // If we have a session, redirect immediately
    if (session) {
      hasProcessedRef.current = true;
      setState('success');
      
      // Clear URL parameters/hash immediately for security
      window.history.replaceState(null, '', window.location.pathname);
      
      timeoutRef.current = setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
      return;
    }

    // No session yet - wait for AuthProvider to process OAuth code or hash
    // For Google OAuth: Supabase processes query params (?code=...) automatically with PKCE flow
    // For Magic Link: Supabase processes hash (#access_token=...) automatically (detectSessionInUrl: true)
    setState('processing');

    console.log('[Auth Callback] Processing auth data:', {
      hasOAuthCode: !!oauthCode,
      hasHashToken: !!hashParams?.get('access_token'),
      hash: window.location.hash.substring(0, 50) + '...',
      currentSession: !!session,
    });

    // If we have OAuth code, explicitly exchange it for session using exchangeCodeForSession
    // This is required for Google OAuth with PKCE flow
    if (oauthCode && !session) {
      console.log('[Auth Callback] OAuth code detected, exchanging for session...');
      
      // Explicitly exchange OAuth code for session
      // This is the proper way to handle OAuth callbacks with PKCE flow
      supabase.auth.exchangeCodeForSession(oauthCode).then(({ data, error }) => {
        if (error) {
          console.error('[Auth Callback] Error exchanging OAuth code:', error);
          if (!hasProcessedRef.current) {
            hasProcessedRef.current = true;
            setState('error');
            setError(error.message || 'Failed to authenticate with Google');
            window.history.replaceState(null, '', window.location.pathname);
            setTimeout(() => router.push('/login'), 2000);
          }
        } else if (data.session && !hasProcessedRef.current) {
          console.log('[Auth Callback] ✅ Session established via OAuth code exchange');
          // Session established via OAuth code exchange
          // AuthProvider will detect this via onAuthStateChange
          // But we also handle it here as fallback
          hasProcessedRef.current = true;
          setState('success');
          window.history.replaceState(null, '', window.location.pathname);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setTimeout(() => router.push('/dashboard'), 1000);
        }
      }).catch((err) => {
        console.error('[Auth Callback] Exception exchanging OAuth code:', err);
        if (!hasProcessedRef.current) {
          hasProcessedRef.current = true;
          setState('error');
          setError('Failed to authenticate. Please try again.');
          window.history.replaceState(null, '', window.location.pathname);
          setTimeout(() => router.push('/login'), 2000);
        }
      });
    }

    // If we have magic link hash fragment, explicitly trigger session retrieval
    // Supabase with detectSessionInUrl should handle this automatically, but we ensure it happens
    if (hashParams?.get('access_token') && !session && !oauthCode) {
      console.log('[Auth Callback] Magic link hash detected, triggering session retrieval...');
      
      // Explicitly call getSession to ensure Supabase processes the hash
      // With detectSessionInUrl: true, this should automatically extract tokens from hash
      supabase.auth.getSession().then(({ data, error }) => {
        if (error) {
          console.error('[Auth Callback] Error getting session from hash:', error);
          // Don't fail immediately - wait for onAuthStateChange to fire
        } else if (data.session && !hasProcessedRef.current) {
          console.log('[Auth Callback] ✅ Session established via magic link hash');
          hasProcessedRef.current = true;
          setState('success');
          window.history.replaceState(null, '', window.location.pathname);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setTimeout(() => router.push('/dashboard'), 1000);
        } else if (!data.session) {
          console.log('[Auth Callback] No session yet from hash, waiting for onAuthStateChange...');
          // Session will be established via onAuthStateChange event
        }
      }).catch((err) => {
        console.error('[Auth Callback] Exception getting session from hash:', err);
        // Don't fail - wait for onAuthStateChange
      });
    }

    // Set timeout as safety net
    timeoutRef.current = setTimeout(() => {
      if (!hasProcessedRef.current && !session) {
        hasProcessedRef.current = true;
        setState('timeout');
        setError('Authentication timeout. Please try again.');
        
        window.history.replaceState(null, '', window.location.pathname);
        
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    }, CALLBACK_TIMEOUT);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [router, session, authLoading]);

  // Watch for session changes (handled by AuthProvider)
  // This catches session established via:
  // 1. OAuth code exchange (exchangeCodeForSession)
  // 2. Magic link hash processing (detectSessionInUrl)
  // 3. Any other auth state change
  useEffect(() => {
    if (session && !hasProcessedRef.current) {
      console.log('[Auth Callback] ✅ Session detected from AuthProvider');
      hasProcessedRef.current = true;
      setState('success');
      
      // Clear URL parameters/hash immediately for security
      window.history.replaceState(null, '', window.location.pathname);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    }
  }, [session, router]);

  return {
    state,
    error,
    isProcessing: state === 'processing' || state === 'idle',
  };
}
