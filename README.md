# Wavely Messenger

A responsive WhatsApp-inspired messenger built with Next.js 16, React 19, Tailwind CSS 4, and plain JavaScript. It includes authentication, API-backed chats, optimistic sending, voice/video call UI, and WebRTC calls signaled over authenticated STOMP/WebSocket.

## Getting started

Start the sibling Spring service first:

```bash
cd ../my-messenger
docker compose up -d
mvn spring-boot:run
```

Then start Wavely in another terminal:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Registering creates the user through the Spring API and signs them in immediately; returning users can sign in with the same email and password.

## Scripts

- `npm run dev` starts the development server.
- `npm run build` creates a production build.
- `npm start` serves the production build.
- `npm run lint` runs ESLint across the project.

## Demo API

To use the built-in demo instead, clear both public environment values in `.env.local`. Demo mode skips account authentication and uses these Next.js endpoints:

- `GET /api/conversations` returns the conversation list.
- `GET /api/conversations/:id/messages` returns a conversation and its message history.
- `POST /api/conversations/:id/messages` creates a new message in that conversation.

The demo data is intended for local UI development and is not a persistent production datastore.

## External API integration

The client is mapped to the sibling Spring Boot service in `../my-messenger`. Start that backend, then set:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_SOCKET_URL=ws://localhost:8080/ws
```

The external mode uses:

- `POST /api/auth/login`, `/register`, `/refresh`, and `/logout`
- `GET /api/auth/me`
- `GET /v1/api/conversions`
- `GET|POST /v1/api/messages/:conversionId`
- STOMP endpoint `/ws`, publish destination `/app/calls.signal`
- User subscriptions `/user/queue/calls` and `/user/queue/errors`

The access token is supplied in the STOMP `CONNECT` headers. Call media travels peer-to-peer with WebRTC; the backend relays only invite, SDP, and ICE signaling. Production calling requires HTTPS/WSS plus a TURN service for restrictive networks.

If both public environment values are blank, Wavely stays in demo mode with local data and a call preview.
