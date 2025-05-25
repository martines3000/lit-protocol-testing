'use client';

import { StytchProvider } from '@stytch/nextjs';
import { createStytchUIClient } from '@stytch/nextjs/dist/index.ui';

const stytch = createStytchUIClient(
  process.env.NEXT_PUBLIC_STYTCH_PUBLIC_TOKEN || '',
);

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return <StytchProvider stytch={stytch}>{children}</StytchProvider>;
};
