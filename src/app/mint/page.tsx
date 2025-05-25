// import { cookies } from 'next/headers';
import { ClientView } from './ClientVIew';
// import { ClientComponent } from './ClientComponent';

export default async function Page() {
  // const cookieStore = cookies();
  // const stytchSessionJWT = cookieStore.get('stytch_session_jwt')!;

  return (
    <div>
      <ClientView />
    </div>
    // <div className="flex items-center justify-center h-full">
    //   <ClientComponent session_jwt={stytchSessionJWT.value} />
    // </div>
  );
}
