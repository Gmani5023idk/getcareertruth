'use client';

import PusherClient from 'pusher-js';
import { useEffect, useRef, useState } from 'react';

/** Singleton Pusher client — created once per session */
let _client: PusherClient | null = null;

function getClient(): PusherClient {
  if (!_client) {
    _client = new PusherClient(
      process.env.NEXT_PUBLIC_PUSHER_KEY || '',
      {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap2',
        authEndpoint: '/api/pusher/auth',
      }
    );

    _client.connection.bind('error', (err: unknown) => {
      console.error('[Pusher] Connection error:', err);
    });
  }
  return _client;
}

/**
 * Subscribe to a Pusher channel and return it.
 * Auto-unsubscribes on unmount.
 *
 * @param channelName  - e.g. `private-conversation-{id}`
 * @param eventNames   - Events to bind (returns a bound event handler to unbind manually if needed)
 * @returns { channel, error }
 */
export function usePusherChannel(
  channelName: string,
  eventNames: string[] = []
) {
  const [channel, setChannel] = useState<ReturnType<PusherClient['subscribe']> | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const eventHandlers = useRef<Map<string, (data: unknown) => void>>(new Map());

  useEffect(() => {
    const client = getClient();

    const ch = client.subscribe(channelName);

    ch.bind('pusher:subscription_error', (status: unknown) => {
      console.error(`[Pusher] Subscription error on ${channelName}:`, status);
      setConnectionError(
        'Real-time connection failed. Messages may not update automatically. Refresh to see new messages.'
      );
    });

    ch.bind('pusher:subscription_succeeded', () => {
      setConnectionError(null);
    });

    // Bind requested event names
    for (const eventName of eventNames) {
      ch.bind(eventName, (data: unknown) => {
        const handler = eventHandlers.current.get(eventName);
        if (handler) handler(data);
      });
    }

    setChannel(ch);

    return () => {
      // Only unsubscribe if no other component is using the client
      client.unsubscribe(channelName);
      setChannel(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName]);

  /**
   * Register or update a handler for a specific event.
   * Useful for adding handlers after the channel is already subscribed.
   */
  const bindEvent = (eventName: string, handler: (data: unknown) => void) => {
    eventHandlers.current.set(eventName, handler);
    if (channel) {
      channel.unbind(eventName);
      channel.bind(eventName, handler);
    }
  };

  return { channel, connectionError, bindEvent };
}

/** Trigger a client-side Pusher event for local state updates */
export function triggerClientEvent(
  channelName: string,
  eventName: string,
  data: unknown
) {
  const client = getClient();
  const ch = client.channel(channelName);
  if (ch) {
    ch.emit(eventName, data);
  }
}