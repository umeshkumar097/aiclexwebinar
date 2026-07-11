'use strict';

require('dotenv').config();

/**
 * Zonvo MediaSoup SFU Server
 * Runs on: media.webinar.zonvo.tech (4.236.163.156)
 * Port: 2000 (HTTP signaling API)
 * WebRTC Ports: 40000-49999 (UDP)
 */

const express = require('express');
const cors = require('cors');
const mediasoup = require('mediasoup');
const { v4: uuidv4 } = require('uuid');
const https = require('https');
const http = require('http');
const fs = require('fs');

// ─── Config ───────────────────────────────────────────────────────────────────
const {
  PORT            = 2000,
  ANNOUNCED_IP    = '4.236.163.156',
  API_SECRET      = 'zonvo_mediasoup_secret_change_me',
  RTC_MIN_PORT    = 40000,
  RTC_MAX_PORT    = 49999,
  CORS_ORIGINS    = 'https://webinar.zonvo.tech,https://api.webinar.zonvo.tech',
  NUM_WORKERS     = 0, // 0 = use os.cpus().length
} = process.env;

const allowedOrigins = CORS_ORIGINS.split(',').map(s => s.trim());

// ─── MediaSoup codec capabilities ────────────────────────────────────────────
const mediaCodecs = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2,
  },
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
    parameters: {
      'x-google-start-bitrate': 1000,
    },
  },
  {
    kind: 'video',
    mimeType: 'video/VP9',
    clockRate: 90000,
    parameters: {
      'profile-id': 2,
      'x-google-start-bitrate': 1000,
    },
  },
  {
    kind: 'video',
    mimeType: 'video/h264',
    clockRate: 90000,
    parameters: {
      'packetization-mode': 1,
      'profile-level-id': '4d0032',
      'level-asymmetry-allowed': 1,
      'x-google-start-bitrate': 1000,
    },
  },
];

// ─── State ────────────────────────────────────────────────────────────────────
const workers = [];
let workerIndex = 0;

/**
 * rooms = Map<roomId, {
 *   router,
 *   transports: Map<transportId, transport>,
 *   producers: Map<producerId, producer>,
 *   consumers: Map<consumerId, consumer>,
 *   peers: Map<peerId, { role, transportIds, producerIds, consumerIds }>,
 * }>
 */
const rooms = new Map();

// ─── Worker Pool ──────────────────────────────────────────────────────────────
async function createWorkers() {
  const numWorkers = NUM_WORKERS > 0 ? parseInt(NUM_WORKERS) : require('os').cpus().length;
  console.log(`[mediasoup] Creating ${numWorkers} workers...`);

  for (let i = 0; i < numWorkers; i++) {
    const worker = await mediasoup.createWorker({
      logLevel: 'warn',
      logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
      rtcMinPort: parseInt(RTC_MIN_PORT),
      rtcMaxPort: parseInt(RTC_MAX_PORT),
    });

    worker.on('died', () => {
      console.error(`[mediasoup] Worker ${worker.pid} died! Restarting...`);
      workers.splice(workers.indexOf(worker), 1);
      createWorkers();
    });

    workers.push(worker);
    console.log(`[mediasoup] Worker ${i + 1}/${numWorkers} created (pid: ${worker.pid})`);
  }
}

function getNextWorker() {
  const worker = workers[workerIndex % workers.length];
  workerIndex++;
  return worker;
}

// ─── Room Helpers ─────────────────────────────────────────────────────────────
async function getOrCreateRoom(roomId) {
  if (rooms.has(roomId)) return rooms.get(roomId);

  const worker = getNextWorker();
  const router = await worker.createRouter({ mediaCodecs });

  const room = {
    id: roomId,
    router,
    transports: new Map(),
    producers: new Map(),
    consumers: new Map(),
    peers: new Map(),
    createdAt: new Date(),
  };

  rooms.set(roomId, room);
  console.log(`[room] Created room: ${roomId}`);
  return room;
}

function destroyRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  // Close all transports (cascades to producers/consumers)
  for (const transport of room.transports.values()) {
    try { transport.close(); } catch {}
  }

  rooms.delete(roomId);
  console.log(`[room] Destroyed room: ${roomId}`);
}

// ─── WebRTC Transport Options ─────────────────────────────────────────────────
function getWebRtcTransportOptions() {
  const turnUrl  = process.env.TURN_URL     || '52.249.217.26';
  const turnUser = process.env.TURN_USERNAME || '';
  const turnPass = process.env.TURN_CREDENTIAL || '';

  const iceServers = [];
  if (turnUser && turnPass) {
    iceServers.push(
      { urls: `stun:${turnUrl}:3478` },
      { urls: `turn:${turnUrl}:3478`,  username: turnUser, credential: turnPass },
      { urls: `turns:${turnUrl}:5349`, username: turnUser, credential: turnPass },
    );
  } else {
    iceServers.push({ urls: `stun:${turnUrl}:3478` });
  }

  return {
    listenInfos: [
      {
        protocol: 'udp',
        ip: '0.0.0.0',
        announcedAddress: ANNOUNCED_IP,
      },
      {
        protocol: 'tcp',
        ip: '0.0.0.0',
        announcedAddress: ANNOUNCED_IP,
      },
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate: 1000000,
    minimumAvailableOutgoingBitrate: 600000,
    maxSctpMessageSize: 262144,
    // TURN credentials returned to client so it can use TURN if direct UDP fails
    appData: { iceServers },
  };
}

// ─── Express App ──────────────────────────────────────────────────────────────
const app = express();

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // server-to-server
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json());

// Prevent browser and proxy caching of dynamic signaling state
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  next();
});

// ─── Auth Middleware ──────────────────────────────────────────────────────────
function requireSecret(req, res, next) {
  const secret = req.headers['x-mediasoup-secret'] || req.query.secret;
  if (secret !== API_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    workers: workers.length,
    rooms: rooms.size,
    timestamp: new Date().toISOString(),
  });
});

// ─── GET /api/rooms/:roomId/rtp-capabilities ──────────────────────────────────
// Returns router RTP capabilities (needed by client to create Device)
app.get('/api/rooms/:roomId/rtp-capabilities', requireSecret, async (req, res) => {
  try {
    const room = await getOrCreateRoom(req.params.roomId);
    res.json({ rtpCapabilities: room.router.rtpCapabilities });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/rooms/:roomId/close ────────────────────────────────────────────
// Destroy a room (called when host ends webinar)
app.post('/api/rooms/:roomId/close', requireSecret, (req, res) => {
  destroyRoom(req.params.roomId);
  res.json({ ok: true });
});

// ─── GET /api/rooms/:roomId/producers ────────────────────────────────────────
// Returns list of active producers in room (so attendees know what to consume)
app.get('/api/rooms/:roomId/producers', requireSecret, async (req, res) => {
  try {
    const room = rooms.get(req.params.roomId);
    if (!room) return res.json({ producers: [] });

    const producers = [];
    for (const [id, producer] of room.producers) {
      if (!producer.closed) {
        producers.push({
          id,
          kind: producer.kind,
          peerId: producer.appData?.peerId,
        });
      }
    }
    res.json({ producers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/rooms/:roomId/transports ──────────────────────────────────────
// Create a WebRTC transport (one for sending, one for receiving per peer)
// Body: { direction: 'send' | 'recv', peerId: string }
app.post('/api/rooms/:roomId/transports', requireSecret, async (req, res) => {
  try {
    const { peerId, direction = 'send' } = req.body;
    const room = await getOrCreateRoom(req.params.roomId);

    const transportOptions = getWebRtcTransportOptions();
    const transport = await room.router.createWebRtcTransport({
      ...transportOptions,
      appData: {
        ...transportOptions.appData,
        peerId,
        direction,
      },
    });

    // Track peer
    if (!room.peers.has(peerId)) {
      room.peers.set(peerId, {
        role: req.body.role || 'attendee',
        transportIds: [],
        producerIds: [],
        consumerIds: [],
      });
    }
    room.peers.get(peerId).transportIds.push(transport.id);
    room.transports.set(transport.id, transport);

    transport.on('dtlsstatechange', (state) => {
      if (state === 'closed') {
        transport.close();
        room.transports.delete(transport.id);
      }
    });

    res.json({
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
      iceServers: transport.appData?.iceServers ?? [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/rooms/:roomId/transports/:transportId/connect ─────────────────
// Connect transport with DTLS parameters from browser
// Body: { dtlsParameters }
app.post('/api/rooms/:roomId/transports/:transportId/connect', requireSecret, async (req, res) => {
  try {
    const room = rooms.get(req.params.roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const transport = room.transports.get(req.params.transportId);
    if (!transport) return res.status(404).json({ error: 'Transport not found' });

    await transport.connect({ dtlsParameters: req.body.dtlsParameters });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/rooms/:roomId/transports/:transportId/produce ─────────────────
// Host starts producing media (audio/video/screen)
// Body: { peerId, kind, rtpParameters, appData }
app.post('/api/rooms/:roomId/transports/:transportId/produce', requireSecret, async (req, res) => {
  try {
    const room = rooms.get(req.params.roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const transport = room.transports.get(req.params.transportId);
    if (!transport) return res.status(404).json({ error: 'Transport not found' });

    const { peerId, kind, rtpParameters, appData = {} } = req.body;

    const producer = await transport.produce({
      kind,
      rtpParameters,
      appData: { ...appData, peerId },
    });

    room.producers.set(producer.id, producer);

    if (room.peers.has(peerId)) {
      room.peers.get(peerId).producerIds.push(producer.id);
    }

    producer.on('transportclose', () => {
      room.producers.delete(producer.id);
    });

    console.log(`[produce] Room: ${req.params.roomId} | peer: ${peerId} | kind: ${kind} | producer: ${producer.id}`);

    res.json({ id: producer.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/rooms/:roomId/transports/:transportId/consume ─────────────────
// Attendee consumes a producer's media
// Body: { peerId, producerId, rtpCapabilities }
app.post('/api/rooms/:roomId/transports/:transportId/consume', requireSecret, async (req, res) => {
  try {
    const room = rooms.get(req.params.roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const transport = room.transports.get(req.params.transportId);
    if (!transport) return res.status(404).json({ error: 'Transport not found' });

    const { peerId, producerId, rtpCapabilities } = req.body;

    const producer = room.producers.get(producerId);
    if (!producer || producer.closed) {
      return res.status(404).json({ error: 'Producer not found or closed' });
    }

    if (!room.router.canConsume({ producerId, rtpCapabilities })) {
      return res.status(400).json({ error: 'Cannot consume this producer' });
    }

    const consumer = await transport.consume({
      producerId,
      rtpCapabilities,
      paused: false,
      appData: { peerId },
    });

    room.consumers.set(consumer.id, consumer);

    if (room.peers.has(peerId)) {
      room.peers.get(peerId).consumerIds.push(consumer.id);
    }

    consumer.on('transportclose', () => {
      room.consumers.delete(consumer.id);
    });
    consumer.on('producerclose', () => {
      room.consumers.delete(consumer.id);
    });

    console.log(`[consume] Created consumer: ${consumer.id} for peer: ${peerId} | kind: ${consumer.kind}`);

    res.json({
      id: consumer.id,
      producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/rooms/:roomId/consumers/:consumerId/resume ────────────────────
app.post('/api/rooms/:roomId/consumers/:consumerId/resume', requireSecret, async (req, res) => {
  try {
    const room = rooms.get(req.params.roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const consumer = room.consumers.get(req.params.consumerId);
    if (!consumer) return res.status(404).json({ error: 'Consumer not found' });

    await consumer.resume();
    console.log(`[consume] Resumed consumer: ${req.params.consumerId} (${consumer.kind})`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/rooms/:roomId/peers/:peerId ──────────────────────────────────
// Clean up peer resources when they leave
app.delete('/api/rooms/:roomId/peers/:peerId', requireSecret, async (req, res) => {
  try {
    const room = rooms.get(req.params.roomId);
    if (!room) return res.json({ ok: true });

    const peer = room.peers.get(req.params.peerId);
    if (!peer) return res.json({ ok: true });

    // Close all transports (auto-closes producers/consumers)
    for (const transportId of peer.transportIds) {
      const transport = room.transports.get(transportId);
      if (transport) {
        try { transport.close(); } catch {}
        room.transports.delete(transportId);
      }
    }

    // Remove producers
    for (const producerId of peer.producerIds) {
      room.producers.delete(producerId);
    }

    // Remove consumers
    for (const consumerId of peer.consumerIds) {
      room.consumers.delete(consumerId);
    }

    room.peers.delete(req.params.peerId);
    console.log(`[peer] Removed peer: ${req.params.peerId} from room: ${req.params.roomId}`);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/rooms (debug) ───────────────────────────────────────────────────
app.get('/api/rooms', requireSecret, (req, res) => {
  const result = [];
  for (const [id, room] of rooms) {
    result.push({
      id,
      peers: room.peers.size,
      producers: room.producers.size,
      consumers: room.consumers.size,
      createdAt: room.createdAt,
    });
  }
  res.json({ rooms: result });
});

// ─── Start ────────────────────────────────────────────────────────────────────
async function start() {
  await createWorkers();

  const server = http.createServer(app);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Zonvo MediaSoup Server running on port ${PORT}`);
    console.log(`   Announced IP : ${ANNOUNCED_IP}`);
    console.log(`   RTC Ports    : ${RTC_MIN_PORT}-${RTC_MAX_PORT}`);
    console.log(`   Workers      : ${workers.length}`);
  });
}

start().catch((err) => {
  console.error('Failed to start MediaSoup server:', err);
  process.exit(1);
});
