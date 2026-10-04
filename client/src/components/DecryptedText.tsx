import { useState, useEffect } from 'react';
import { useE2eeStore } from '../store/useE2eeStore';
import { Lock } from 'lucide-react';

interface DecryptedTextProps {
  content: string;
  senderId: string;
  isMe: boolean;
}

export function DecryptedText({ content, senderId, isMe }: DecryptedTextProps) {
  const [displayText, setDisplayText] = useState<string>(content);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const decryptMessage = useE2eeStore((s) => s.decryptMessage);

  useEffect(() => {
    let isCancelled = false;

    if (content && content.startsWith('{') && content.includes('"e2ee":true')) {
      setIsEncrypted(true);
      void decryptMessage(content, senderId).then((decrypted) => {
        if (!isCancelled) {
          setDisplayText(decrypted);
        }
      });
    } else {
      setIsEncrypted(false);
      setDisplayText(content);
    }

    return () => {
      isCancelled = true;
    };
  }, [content, senderId, decryptMessage]);

  return (
    <div className="flex items-start space-x-1.5">
      {isEncrypted && (
        <span
          title="End-to-End Encrypted Message"
          className={`shrink-0 mt-1 ${isMe ? 'text-indigo-200' : 'text-emerald-500'}`}
        >
          <Lock className="w-3 h-3" />
        </span>
      )}
      <p className="whitespace-pre-wrap break-words leading-relaxed flex-1">{displayText}</p>
    </div>
  );
}
