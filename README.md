# Nero Party

A competitive listening party app where friends join, submit songs anonymously, vote on each other's picks, and crown a winning DJ.

## Features

- **Anonymous Identity System** - Players are assigned random aliases (e.g., "Cosmic Penguin") to keep song submissions secret until the finale reveal
- **Real-time Multiplayer** - Socket.IO powered synchronization keeps all players in sync
- **Confidence Betting** - Set your confidence level (1-5) when submitting songs for bonus/penalty scoring
- **Round-based Gameplay** - Songs are organized into rounds with escalating weight multipliers
- **Live Voting** - Rate songs 1-10 as they play with a smooth slider interface
- **Dramatic Finale** - Scores freeze, identities reveal one-by-one, and the champion is crowned
- **Theme System** - Party-wide themes add creative constraints
- **Glassmorphism UI** - Modern, beautiful interface with smooth animations

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- SoundCloud API credentials (get them at https://developers.soundcloud.com/)

### Installation

```bash
# Install all dependencies
npm install

# Set up environment variables
cp .env.example backend/.env
# Edit backend/.env with your SoundCloud credentials

# Set up the database
cd backend && npx prisma db push && cd ..

# Start the development servers
npm run dev
```

This will start:
- Backend on http://localhost:3000
- Frontend on http://localhost:5173

### Environment Variables

Create `backend/.env` with:

```env
PORT=3000
SOUNDCLOUD_CLIENT_ID=your_soundcloud_client_id
SOUNDCLOUD_CLIENT_SECRET=your_soundcloud_client_secret
```

## How to Play

1. **Create a Party** - Host enters their name and creates a party with a shareable 4-letter code
2. **Join** - Friends enter the party code and their name to join (minimum 3 players)
3. **Configure** - Host can adjust settings (songs per player, play duration, themes)
4. **Submit Songs** - Each player searches SoundCloud and submits their songs with confidence levels
5. **Listen & Vote** - Songs play for everyone, players rate each song 1-10
6. **Finale** - Scores are revealed, identities unveiled, and the winner is crowned!

## Project Structure

```
nero-party/
├── backend/           # Express + Socket.IO server
│   ├── prisma/        # Database schema & migrations
│   └── src/
│       ├── services/  # Business logic (party, song, scoring, etc.)
│       └── types/     # TypeScript type definitions
└── frontend/          # React + Vite client
    └── src/
        ├── components/  # UI components by screen
        ├── store/       # Zustand state management
        └── types/       # Shared type definitions
```

## Tech Stack

- **Backend:** Express.js, Prisma, Socket.IO, TypeScript
- **Frontend:** React, Vite, TailwindCSS, Framer Motion, Zustand
- **Database:** SQLite
- **Music:** SoundCloud API
- **Icons:** Material UI Icons

## Scoring Algorithm

1. **Raw Average** - Mean of all votes (1-10) for a song
2. **Round Weight** - Later rounds have higher multipliers (1.0x → 1.5x → 2.0x)
3. **Confidence Modifier** - High confidence amplifies scores (good or bad)
4. **Final Score** = Raw Average × Round Weight × Confidence Modifier

## Architecture Highlights

- **Anonymous Leaderboard** - Shows aliases and scores without revealing who submitted what
- **Session Persistence** - Players can reconnect within 5 minutes if disconnected
- **Real-time Sync** - All game state changes broadcast instantly to all players
- **Responsive Design** - Works on desktop and mobile devices
