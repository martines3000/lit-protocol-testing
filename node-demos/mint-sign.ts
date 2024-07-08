import { LitAbility, LitPKPResource } from '@lit-protocol/auth-helpers';
import {
  LitAuthClient,
  StytchOtpProvider,
} from '@lit-protocol/lit-auth-client';
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { ProviderType } from '@lit-protocol/constants';
import { readFile, writeFile } from 'node:fs/promises';
import { exit } from 'node:process';
import * as stytch from 'stytch';
import prompts from 'prompts';
import { ethers } from 'ethers';

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
  debug: true,
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

const authMethodId = await StytchOtpProvider.authMethodId(authMethod);

const mintPkp = async () => {
  const relayerBody = {
    keyType: '2',
    permittedAuthMethodTypes: [authMethod.authMethodType],
    permittedAuthMethodIds: [authMethodId],
    permittedAuthMethodPubkeys: ['0x'],
    permittedAuthMethodScopes: [['1']],
    addPkpEthAddressAsPermittedAddress: false,
    sendPkpToItself: true,
  };

  const mintResult = await litAuthClient.relay.mintPKP(
    JSON.stringify(relayerBody),
  );

  console.log(mintResult);

  if (mintResult.requestId) {
    const pollResult = await litAuthClient.relay.pollRequestUntilTerminalState(
      mintResult.requestId,
    );

    console.log(pollResult);

    // Write to file
    await writeFile('mint-result.json', JSON.stringify(pollResult));
  }
};

let mintResult: {
  status: string;
  pkpTokenId: string;
  pkpEthAddress: string;
  pkpPublicKey: string;
} | null = null;

try {
  mintResult = JSON.parse(await readFile('mint-result.json', 'utf-8'));
} catch (e) {
  console.log(e);
  try {
    await mintPkp();
  } catch (e) {
    console.error(e);
    exit(1);
  }
}

if (!mintResult) {
  console.log('No mint result');
  exit(1);
}

const sign = async () => {
  const tokenId = ethers.utils.keccak256(`0x${publicKey}`).substring(2);

  const sessionSigs = await litNodeClient.getPkpSessionSigs({
    authMethods: [authMethod],
    pkpPublicKey: `0x${publicKey}`,
    chain: 'ethereum',
    resourceAbilityRequests: [
      {
        resource: new LitPKPResource(tokenId),
        ability: LitAbility.PKPSigning,
      },
    ],
  });

  const res = await litNodeClient.pkpSign({
    pubKey: `0x${publicKey}`,
    toSign: ethers.utils.arrayify(
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes('Hello world')),
    ),
    sessionSigs,
  });

  console.log(res);
};

sign().catch((e) => console.error(e));
