'use client';

import { StytchLogin } from '@stytch/nextjs';
import { Products, StytchEventType } from '@stytch/vanilla-js';
import { useRouter } from 'next/navigation';

export const LoginForm = () => {
  const router = useRouter();
  const config = {
    products: [Products.otp],
    otpOptions: {
      expirationMinutes: 8,
      methods: ['email'],
    },
    sessionOptions: {
      sessionDurationMinutes: 60 * 4,
    },
  } as Parameters<typeof StytchLogin>[0]['config'];

  return (
    <StytchLogin
      config={config}
      callbacks={{
        onEvent: (event) => {
          if (event.type === StytchEventType.OTPsAuthenticate) {
            router.push('/');
          }
        },
      }}
    />
  );
};
