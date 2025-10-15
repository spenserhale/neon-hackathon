"use client";

import { useMemo } from "react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";
import { ThreadList } from "@/components/assistant-ui/thread-list";
import { AssistantCloud } from "@assistant-ui/react";
import { ProfileButton } from "@/components/profile-button";
import Dither from "@/components/Dither";
import Link from "next/link";

export const Assistant = () => {
  const cloud = useMemo(
    () =>
      new AssistantCloud({
        baseUrl: process.env.NEXT_PUBLIC_ASSISTANT_BASE_URL!,
        authToken: () =>
          fetch("/api/chat/token", { method: "POST" }).then((r) =>
            r.json().then((data: any) => data.token),
          ),
      }),
    [],
  );

  const runtime = useChatRuntime({
    cloud,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex h-dvh flex-col">
        <header className="relative w-full flex items-center justify-between px-4 py-2 bg-[#FF4A04] text-white border-b border-[#FBAE41] overflow-hidden">
          {/* Dither background effect */}
          <div className="absolute inset-0 w-full h-full z-0">
            <Dither
              waveColor={[1.0, 0.29, 0.02]}
              waveColor2={[1.0, 0.87, 0.6]}
              disableAnimation={false}
              enableMouseInteraction={true}
              mouseRadius={0.3}
              colorNum={8}
              waveAmplitude={0.15}
              waveFrequency={2}
              waveSpeed={0.03}
              pixelSize={2}
            />
          </div>

          {/* Header content */}
          <div className="relative z-10 flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="66" height="30" viewBox="0 0 66 30" fill="none" className="shrink-0 transition-colors duration-200 ease-out text-background-100" id="nav-logo-icon"><path fill="currentColor" className="transition-colors duration-400 ease-out" d="M52.688 13.028c-.22 0-.437.008-.654.015a.3.3 0 0 0-.102.024.37.37 0 0 0-.236.255l-.93 3.249c-.401 1.397-.252 2.687.422 3.634.618.876 1.646 1.39 2.894 1.45l5.045.306a.45.45 0 0 1 .435.41.5.5 0 0 1-.025.223.64.64 0 0 1-.547.426l-5.242.306c-2.848.132-5.912 2.456-6.987 5.29l-.378 1a.28.28 0 0 0 .248.382h18.054a.48.48 0 0 0 .464-.35c.32-1.153.482-2.344.48-3.54 0-7.22-5.79-13.072-12.933-13.072M44.807 29.578l.334-1.175c.402-1.397.253-2.687-.42-3.634-.62-.876-1.647-1.39-2.896-1.45l-23.665-.306a.47.47 0 0 1-.374-.199.5.5 0 0 1-.052-.434.64.64 0 0 1 .552-.426l23.886-.306c2.836-.131 5.9-2.456 6.975-5.29l1.362-3.6a.9.9 0 0 0 .04-.477C48.997 5.259 42.789 0 35.367 0c-6.842 0-12.647 4.462-14.73 10.665a6.92 6.92 0 0 0-4.911-1.374c-3.28.33-5.92 3.002-6.246 6.318a7.2 7.2 0 0 0 .18 2.472C4.3 18.241 0 22.679 0 28.133q0 .74.106 1.453a.46.46 0 0 0 .457.402h43.704a.57.57 0 0 0 .54-.418"></path></svg>
            </Link>
            <Link
              href="/audit"
              className="text-white hover:text-yellow-200 transition-colors duration-200 font-medium"
            >
              Website Audit
            </Link>
          </div>
          <div className="relative z-10">
            <ProfileButton />
          </div>
        </header>
        <div className="grid flex-1 grid-cols-[200px_1fr] gap-x-2 px-4 py-4 overflow-hidden">
          <ThreadList />
          <Thread />
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
};
