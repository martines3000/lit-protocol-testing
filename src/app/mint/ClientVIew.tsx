'use client';

import { mint } from '@/actions/mint';
import { Button } from '@/components/ui/button';

export const ClientView = () => {
  return (
    <div>
      <Button onClick={async () => await mint()}>Click me</Button>
    </div>
  );
};
