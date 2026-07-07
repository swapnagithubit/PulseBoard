import React, { createContext, useState, useEffect, useContext } from "react";
import { io } from "socket.io-client";
import { AuthContext } from "./AuthContext";

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { token } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [kafkaStatus, setKafkaStatus] = useState("Disconnected");
  const [liveEvents, setLiveEvents] = useState([]);
  const [latestKpis, setLatestKpis] = useState(null);
  const [realtimeAlerts, setRealtimeAlerts] = useState([]);

  useEffect(() => {
    // Only connect if the user is authenticated
    if (!token) {
      if (socket) {
        socket.disconnect();
      }
      return;
    }

    // Try to connect to backend on common ports (5000, 5001, 5002, etc.)
    const connectToBackend = () => {
      const ports = [5000, 5001, 5002, 5003];
      let currentPortIndex = 0;

      const tryConnect = (portIndex) => {
        if (portIndex >= ports.length) {
          console.warn("⚠️ Could not connect to backend on any port");
          return;
        }

        const port = ports[portIndex];
        const socketUrl = `http://localhost:${port}`;

        console.log(`🔌 Attempting to connect to ${socketUrl}...`);

        const newSocket = io(socketUrl, {
          transports: ["websocket", "polling"],
          reconnection: false, // We'll handle reconnection manually
        });

        const connectionTimeout = setTimeout(() => {
          console.warn(`⚠️ Connection attempt to port ${port} timed out`);
          newSocket.disconnect();
          tryConnect(portIndex + 1);
        }, 2000);

        newSocket.on("connect", () => {
          clearTimeout(connectionTimeout);
          setIsConnected(true);
          console.log(`✅ Connected to socket server on port ${port}`);
          setSocket(newSocket);
        });

        newSocket.on("connect_error", () => {
          clearTimeout(connectionTimeout);
          console.warn(`❌ Connection error on port ${port}`);
          newSocket.disconnect();
          tryConnect(portIndex + 1);
        });

        newSocket.on("disconnect", () => {
          setIsConnected(false);
          console.log("❌ Disconnected from socket server");
        });

        newSocket.on("consumer-status", (status) => {
          setKafkaStatus(status);
        });

        newSocket.on("new-event", (event) => {
          setLiveEvents((prev) => {
            const exists = prev.some((e) => (e._id || e.id) === (event._id || event.id));
            if (exists) return prev;
            const updated = [event, ...prev];
            return updated.slice(0, 25);
          });
        });

        newSocket.on("analytics-update", (data) => {
          setLatestKpis(data);
        });

        newSocket.on("new-alert", (alert) => {
          setRealtimeAlerts((prev) => {
            const exists = prev.some((a) => (a._id || a.id) === (alert._id || alert.id));
            if (exists) return prev;
            const updated = [alert, ...prev];
            return updated.slice(0, 30);
          });
        });
      };

      tryConnect(0);
    };

    connectToBackend();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [token]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        kafkaStatus,
        liveEvents,
        latestKpis,
        realtimeAlerts,
        setRealtimeAlerts,
        setLiveEvents
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

