import { LitAbility, LitActionResource } from '@lit-protocol/auth-helpers';
import { LitAuthClient } from '@lit-protocol/lit-auth-client';
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { ProviderType } from '@lit-protocol/constants';
import * as stytch from 'stytch';
import prompts from 'prompts';
import { ethers } from 'ethers';
import { api } from '@lit-protocol/wrapped-keys';

const { generatePrivateKey, signMessageWithEncryptedKey } = api;

// Read session JWT from env
const STYTCH_PROJECT_ID = process.env.STYTCH_PROJECT_ID!;
const STYTCH_SECRET = process.env.STYTCH_SECRET!;

const client = new stytch.Client({
  project_id: STYTCH_PROJECT_ID,
  secret: STYTCH_SECRET,
});

const emailResponse = await prompts({
  type: 'text',
  name: 'email',
  message: 'Enter your email address',
});

const stytchResponse = await client.otps.email.loginOrCreate({
  email: emailResponse.email,
});

const otpResponse = await prompts({
  type: 'text',
  name: 'code',
  message: 'Enter the code sent to your email:',
});

const authResponse = await client.otps.authenticate({
  method_id: stytchResponse.email_id,
  code: otpResponse.code,
  session_duration_minutes: 60 * 24 * 7,
});

const sessionStatus = await client.sessions.authenticate({
  session_token: authResponse.session_token,
});

// Create LitNodeClient
const litNodeClient = new LitNodeClient({
  litNetwork: 'cayenne',
  debug: false,
});

await litNodeClient.connect();

// Create LitAuthClient
const litAuthClient = new LitAuthClient({
  litNodeClient,
  litRelayConfig: {
    relayApiKey: process.env.RELAYER_API_KEY,
  },
});

const session = litAuthClient.initProvider(ProviderType.StytchEmailFactorOtp, {
  userId: sessionStatus.session.user_id,
  appId: STYTCH_PROJECT_ID,
});

const authMethod = await session.authenticate({
  accessToken: sessionStatus.session_jwt,
});

const publicKey = await session.computePublicKeyFromAuthMethod(authMethod);

if (process.argv.includes('--claim')) {
  // Authenticates an auth Method for claiming a PKP
  await session.claimKeyId({
    authMethod,
  });

  console.log('Claim successful');

  // Get session sigs for PKP
  const sessionSigs = await litNodeClient.getPkpSessionSigs({
    authMethods: [authMethod],
    pkpPublicKey: `0x${publicKey}`,
    chain: 'ethereum',
    resourceAbilityRequests: [
      {
        resource: new LitActionResource('*'),
        ability: LitAbility.LitActionExecution,
      },
    ],
  });

  // Sign using session sigs
  const res = await litNodeClient.pkpSign({
    pubKey: `0x${publicKey}`,
    toSign: ethers.utils.arrayify(
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes('Hello world')),
    ),
    sessionSigs,
  });

  console.log('Signature response: ');
  console.log(res);
} else if (process.argv.length >= 2 && process.argv.includes('--lookup')) {
  // Fetch PKP info from relayer
  const pkpInfo = await session.fetchPKPsThroughRelayer(authMethod);
  console.log('pkp info resolved: ', pkpInfo);

  const matchingKey = pkpInfo.filter(
    (info) => info.publicKey.replace('0x', '') === publicKey,
  );
  console.log('matching key from relayer look up: ', matchingKey);

  // Get session sigs for PKP
  const pkpSessionSigs = await litNodeClient.getPkpSessionSigs({
    authMethods: [authMethod],
    pkpPublicKey: `0x${publicKey}`,
    chain: 'ethereum',
    resourceAbilityRequests: [
      {
        resource: new LitActionResource('*'),
        ability: LitAbility.LitActionExecution,
      },
    ],
    expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(), // 10 minutes for security reasons
  });

  // const { pkpAddress, generatedPublicKey } = await generatePrivateKey({
  //   pkpSessionSigs,
  //   network: 'evm',
  //   litNodeClient,
  // });

  console.log('PKP Info: ', JSON.stringify(pkpInfo, null, 2));
  // console.log('PKP Address: ', pkpAddress);
  // console.log('Generated Public Key: ', generatedPublicKey);

  const signature = await signMessageWithEncryptedKey({
    pkpSessionSigs,
    network: 'evm',
    messageToSign: 'The answer to the Universe is 42.',
    litNodeClient,
  });

  console.log('Signature: ', signature);
}
