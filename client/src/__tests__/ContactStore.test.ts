import { describe, it, expect, beforeEach } from 'vitest';
import { useContactStore } from '../store/useContactStore';

describe('useContactStore', () => {
  beforeEach(() => {
    useContactStore.setState({
      contacts: [],
      incomingRequests: [],
      outgoingRequests: [],
      isLoading: false,
      error: null,
    });
  });

  it('initializes with empty contacts and requests', () => {
    const state = useContactStore.getState();
    expect(state.contacts).toEqual([]);
    expect(state.incomingRequests).toEqual([]);
    expect(state.outgoingRequests).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('updates state with mock contacts', () => {
    const mockContact = {
      contactId: 'c1',
      userId: 'u1',
      username: 'bob',
      displayName: 'Bob Jones',
      avatarUrl: null,
      bio: 'Hello world',
      statusMessage: 'Online',
      lastSeen: null,
      connectedAt: new Date().toISOString(),
    };

    useContactStore.setState({ contacts: [mockContact] });
    expect(useContactStore.getState().contacts).toHaveLength(1);
    expect(useContactStore.getState().contacts[0].username).toBe('bob');
  });

  it('filters out request when locally responded', () => {
    const mockReq = {
      requestId: 'req-123',
      userId: 'u2',
      username: 'carol',
      displayName: 'Carol Danvers',
      avatarUrl: null,
      statusMessage: null,
      createdAt: new Date().toISOString(),
    };

    useContactStore.setState({ incomingRequests: [mockReq] });
    expect(useContactStore.getState().incomingRequests).toHaveLength(1);

    useContactStore.setState((state) => ({
      incomingRequests: state.incomingRequests.filter((r) => r.requestId !== 'req-123'),
    }));
    expect(useContactStore.getState().incomingRequests).toHaveLength(0);
  });
});
