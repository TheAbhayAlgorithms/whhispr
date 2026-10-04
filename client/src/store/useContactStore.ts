import { create } from 'zustand';
import { ContactUser, ContactRequest, ContactsResponse, PendingRequestsResponse } from '../types/contact';
import { apiRequest } from '../lib/api';

interface ContactState {
  contacts: ContactUser[];
  incomingRequests: ContactRequest[];
  outgoingRequests: ContactRequest[];
  isLoading: boolean;
  error: string | null;

  fetchContacts: () => Promise<void>;
  fetchRequests: () => Promise<void>;
  sendContactRequest: (target: { targetUserId?: string; username?: string }) => Promise<{ status: string; message: string }>;
  respondToRequest: (requestId: string, action: 'accept' | 'reject') => Promise<void>;
  removeContact: (targetUserId: string) => Promise<void>;
}

export const useContactStore = create<ContactState>((set, get) => ({
  contacts: [],
  incomingRequests: [],
  outgoingRequests: [],
  isLoading: false,
  error: null,

  fetchContacts: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiRequest<{ success: boolean; data: ContactsResponse }>('/api/v1/contacts');
      set({ contacts: res.data.contacts, isLoading: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch contacts';
      set({ error: msg, isLoading: false });
    }
  },

  fetchRequests: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiRequest<{ success: boolean; data: PendingRequestsResponse }>('/api/v1/contacts/requests');
      set({
        incomingRequests: res.data.incoming,
        outgoingRequests: res.data.outgoing,
        isLoading: false,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch pending requests';
      set({ error: msg, isLoading: false });
    }
  },

  sendContactRequest: async (target: { targetUserId?: string; username?: string }) => {
    set({ error: null });
    try {
      const res = await apiRequest<{
        success: boolean;
        data: { status: 'pending' | 'accepted'; message: string; contactId?: string };
      }>('/api/v1/contacts/requests', {
        method: 'POST',
        body: JSON.stringify(target),
      });

      // Refresh contacts and requests
      void get().fetchRequests();
      if (res.data.status === 'accepted') {
        void get().fetchContacts();
      }

      return res.data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send contact request';
      set({ error: msg });
      throw err;
    }
  },

  respondToRequest: async (requestId: string, action: 'accept' | 'reject') => {
    set({ error: null });
    try {
      await apiRequest(`/api/v1/contacts/requests/${requestId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });

      // Update local state immediately
      set((state) => ({
        incomingRequests: state.incomingRequests.filter((r) => r.requestId !== requestId),
      }));

      // If accepted, refresh contacts list
      if (action === 'accept') {
        void get().fetchContacts();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to respond to request';
      set({ error: msg });
      throw err;
    }
  },

  removeContact: async (targetUserId: string) => {
    set({ error: null });
    try {
      await apiRequest(`/api/v1/contacts/${targetUserId}`, {
        method: 'DELETE',
      });

      set((state) => ({
        contacts: state.contacts.filter((c) => c.userId !== targetUserId),
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove contact';
      set({ error: msg });
      throw err;
    }
  },
}));
