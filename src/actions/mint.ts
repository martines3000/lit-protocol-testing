'use server';

import { cookies } from 'next/headers';

import * as LitJsSdk from '@lit-protocol/lit-node-client';
import { AuthMethodType, ProviderType } from '@lit-protocol/constants';

export async function mint() {
  const cookieStore = cookies();
  console.log('minting');
  console.log(cookieStore);

  const client = new LitJsSdk.LitNodeClient({
    litNetwork: 'cayenne',
    debug: true,
  });

  await client.connect();

  // const authMethod = {
  //   authMethodType: AuthMethodType.StytchOtp,
  //   accessToken: cookieStore.get('access_token'),
  // };

  // client.ses

  console.log('ok');
}
