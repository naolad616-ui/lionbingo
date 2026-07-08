import { useEffect } from 'react';
import { initGameSalesTracking } from '../../utils/gameSalesTracking';
import { useAuth } from '../../context/AuthContext';

export default function GameSalesTrackingInit() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }

    initGameSalesTracking();
    return undefined;
  }, [isAuthenticated]);

  return null;
}
