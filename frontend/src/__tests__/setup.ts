import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

// Mock Socket.IO client for tests
vi.mock('../lib/socket', () => ({
  socket: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
    id: 'test-socket-id',
    io: {
      on: vi.fn(),
      off: vi.fn(),
    },
  },
}));
