import { useState, useEffect } from 'react';
import { useContactStore } from '../store/useContactStore';
import {
  Clock,
  X,
  Check,
  Loader2,
  Bell,
} from 'lucide-react';

interface ContactRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactRequestsModal({ isOpen, onClose }: ContactRequestsModalProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const {
    incomingRequests,
    fetchRequests,
    fetchContacts,
    respondToRequest,
  } = useContactStore();

  useEffect(() => {
    if (isOpen) {
      void fetchRequests();
    }
  }, [isOpen, fetchRequests]);

  const handleAccept = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await respondToRequest(requestId, 'accept');
      setActionSuccess('Contact request accepted!');
      setTimeout(() => setActionSuccess(null), 3000);
      void fetchRequests();
      void fetchContacts();
    } catch {
      // Handled in store
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await respondToRequest(requestId, 'reject');
      setActionSuccess('Contact request rejected');
      setTimeout(() => setActionSuccess(null), 3000);
      void fetchRequests();
    } catch {
      // Handled in store
    } finally {
      setProcessingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#141515] border border-[#E5E5E3] dark:border-[#2C2E2E] rounded-3xl sm:rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-up mt-12 sm:mt-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-4.5 border-b border-[#E5E5E3] dark:border-[#2C2E2E] flex items-center justify-between bg-white dark:bg-[#141515] shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#191A1A] dark:text-[#EDEDED]">
                New Contact Requests
              </h3>
              <p className="text-xs text-[#737878] dark:text-[#9EA3A3]">
                {incomingRequests.length} pending invitation{incomingRequests.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#F3F3F2] dark:bg-[#202222] hover:bg-[#ECECEB] dark:hover:bg-[#262828] text-[#737878] dark:text-[#9EA3A3] hover:text-[#191A1A] dark:hover:text-[#EDEDED] flex items-center justify-center transition cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action feedback toast */}
        {actionSuccess && (
          <div className="mx-4 mt-3 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center space-x-2 animate-in fade-in">
            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Requests List */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-2.5">
          {incomingRequests.length > 0 ? (
            incomingRequests.map((req) => (
              <div
                key={req.requestId}
                className="p-3 sm:p-3.5 rounded-2xl bg-[#F9F9F8] dark:bg-[#191A1A] border border-[#E5E5E3] dark:border-[#2D3030] flex items-center justify-between space-x-3 transition"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="relative shrink-0">
                    {req.avatarUrl ? (
                      <img
                        src={req.avatarUrl}
                        alt={req.displayName}
                        className="w-10 h-10 rounded-full object-cover border border-[#E5E5E3] dark:border-[#2D3030]"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#E6F7F6] dark:bg-[#202222] border border-[#B2E5E2] dark:border-[#2D3030] flex items-center justify-center text-[#20B2AA] font-bold text-sm">
                        {req.displayName ? req.displayName.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-semibold text-[#191A1A] dark:text-[#EDEDED] truncate">
                      {req.displayName}
                    </h4>
                    <p className="text-xs text-[#20B2AA] font-medium truncate">
                      @{req.username}
                    </p>
                  </div>
                </div>

                {/* Accept and Reject Buttons */}
                <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={() => handleAccept(req.requestId)}
                    disabled={processingId === req.requestId}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-[#20B2AA] hover:bg-[#1CA099] text-black text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {processingId === req.requestId ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-black" />
                    )}
                    <span>Accept</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(req.requestId)}
                    disabled={processingId === req.requestId}
                    className="p-1.5 rounded-xl text-[#737878] dark:text-[#9EA3A3] hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                    title="Reject"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 px-4 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#F3F3F2] dark:bg-[#202222] border border-[#E5E5E3] dark:border-[#2D3030] flex items-center justify-center text-[#20B2AA] mb-3">
                <Bell className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-[#191A1A] dark:text-[#EDEDED]">
                All Caught Up!
              </h4>
              <p className="text-xs text-[#737878] dark:text-[#9EA3A3] mt-1">
                You have no pending contact requests.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
