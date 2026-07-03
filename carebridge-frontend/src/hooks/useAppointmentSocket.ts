import { useEffect, useRef, useState, useCallback } from "react";
import { Client, IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export interface AppointmentEvent {
  appointmentId: number;
  status: string;
  patientEmail: string | null;
  therapistEmail: string | null;
  hospitalEmail: string | null;
  appointmentDate: string | null;
  appointmentTime: string | null;
  updatedAt: string;
  message: string | null;
}

interface UseAppointmentSocketOptions {
  onEvent?: (event: AppointmentEvent) => void;
}

interface UseAppointmentSocketReturn {
  lastEvent: AppointmentEvent | null;
  isConnected: boolean;
  connectionError: string | null;
}

const MAX_RECONNECT = 3;
const RECONNECT_DELAY_MS = 2000;

export function useAppointmentSocket(
  options?: UseAppointmentSocketOptions
): UseAppointmentSocketReturn {
  const [lastEvent, setLastEvent] = useState<AppointmentEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const clientRef = useRef<Client | null>(null);
  const reconnectCount = useRef(0);
  const onEventRef = useRef(options?.onEvent);
  onEventRef.current = options?.onEvent;

  const handleMessage = useCallback((msg: IMessage) => {
    try {
      const event: AppointmentEvent = JSON.parse(msg.body);
      setLastEvent(event);
      onEventRef.current?.(event);
    } catch {
      // ignore parse errors
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userEmail = localStorage.getItem("userEmail");
    if (!token || !userEmail) return;

    let destroyed = false;

    const connect = () => {
      if (destroyed) return;

      const client = new Client({
        webSocketFactory: () =>
          new SockJS(`${API_BASE}/ws?token=${token}`),
        reconnectDelay: 0, // manual reconnect
        onConnect: () => {
          reconnectCount.current = 0;
          setIsConnected(true);
          setConnectionError(null);

          // Subscribe to broadcast channel (for provider dashboards)
          client.subscribe("/topic/appointments", handleMessage);

          // Subscribe to personal user channel
          client.subscribe(
            `/user/${encodeURIComponent(userEmail)}/queue/updates`,
            handleMessage
          );
        },
        onDisconnect: () => {
          setIsConnected(false);
          if (!destroyed) scheduleReconnect();
        },
        onStompError: (frame) => {
          setIsConnected(false);
          console.error("STOMP error", frame);
          if (!destroyed) scheduleReconnect();
        },
        onWebSocketError: (err) => {
          setIsConnected(false);
          console.error("WebSocket error", err);
          if (!destroyed) scheduleReconnect();
        },
      });

      clientRef.current = client;
      client.activate();
    };

    const scheduleReconnect = () => {
      if (destroyed) return;
      if (reconnectCount.current >= MAX_RECONNECT) {
        setConnectionError(
          "Real-time updates unavailable. Please refresh the page."
        );
        return;
      }
      reconnectCount.current += 1;
      setTimeout(connect, RECONNECT_DELAY_MS);
    };

    connect();

    return () => {
      destroyed = true;
      clientRef.current?.deactivate();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { lastEvent, isConnected, connectionError };
}
