import React, { createContext, useContext } from 'react';

type MessageAlign = 'start' | 'end';

interface MessageContextValue {
  align: MessageAlign;
}

const MessageContext = createContext<MessageContextValue>({ align: 'start' });

export interface MessageProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: MessageAlign;
  className?: string;
  children?: React.ReactNode;
}

export function Message({
  align = 'start',
  className = '',
  children,
  ...props
}: MessageProps) {
  const isEnd = align === 'end';

  return (
    <MessageContext.Provider value={{ align }}>
      <div
        className={`flex w-full items-end gap-2.5 sm:gap-3 ${
          isEnd ? 'flex-row-reverse justify-start' : 'flex-row justify-start'
        } ${className}`}
        {...props}
      >
        {children}
      </div>
    </MessageContext.Provider>
  );
}

export interface MessageAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: React.ReactNode;
}

export function MessageAvatar({ className = '', children, ...props }: MessageAvatarProps) {
  return (
    <div className={`shrink-0 mb-0.5 select-none ${className}`} {...props}>
      {children}
    </div>
  );
}

export interface MessageContentProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: React.ReactNode;
}

export function MessageContent({ className = '', children, ...props }: MessageContentProps) {
  const { align } = useContext(MessageContext);
  const isEnd = align === 'end';

  return (
    <div
      className={`flex flex-col max-w-[82%] sm:max-w-md md:max-w-lg min-w-0 ${
        isEnd ? 'items-end' : 'items-start'
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { Bubble, BubbleContent, BubbleGroup } from './bubble';

export function MessageAvatarDemo() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-6 py-12">
      <Message>
        <MessageAvatar>
          <Avatar>
            <AvatarImage src="/avatars/03.png" alt="@avatar" />
            <AvatarFallback>R</AvatarFallback>
          </Avatar>
        </MessageAvatar>
        <MessageContent>
          <Bubble variant="muted">
            <BubbleContent>
              The build failed during dependency installation.
            </BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
      <Message align="end">
        <MessageAvatar>
          <Avatar>
            <AvatarImage src="/avatars/10.png" alt="@avatar" />
            <AvatarFallback>R</AvatarFallback>
          </Avatar>
        </MessageAvatar>
        <MessageContent>
          <Bubble>
            <BubbleContent>Can you share the exact error?</BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
      <Message>
        <MessageAvatar>
          <Avatar>
            <AvatarImage src="/avatars/03.png" alt="@avatar" />
            <AvatarFallback>R</AvatarFallback>
          </Avatar>
        </MessageAvatar>
        <MessageContent>
          <BubbleGroup>
            <Bubble variant="muted">
              <BubbleContent>Here&apos;s the error from the logs</BubbleContent>
            </Bubble>
            <Bubble variant="muted">
              <BubbleContent>
                Something went wrong with the build. The libraries are not
                installed correctly. Try running the build again.
              </BubbleContent>
            </Bubble>
          </BubbleGroup>
        </MessageContent>
      </Message>
    </div>
  );
}

