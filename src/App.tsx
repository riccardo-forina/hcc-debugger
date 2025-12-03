import React, { useEffect } from 'react';
import { useChrome } from '@redhat-cloud-services/frontend-components/useChrome';

import { Debugger } from './Debugger';
import { ChromeUser } from '@redhat-cloud-services/types';

const App = () => {
  const { auth } = useChrome();
  const [user, setUser] = React.useState<ChromeUser | null>(null);
  useEffect(() => {
    auth.getUser().then((user) => {
      user && setUser(user);
    });
  }, []);


  return (
    user ? <Debugger user={user} /> : null
  );
};

export default App;
