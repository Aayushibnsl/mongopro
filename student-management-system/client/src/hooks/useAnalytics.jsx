import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { getAnalytics } from '../services/analyticsService.js';
import { getErrorMessage } from '../services/api.js';

/*
 * The dashboard, attendance, performance and insights screens all read from the
 * same analytics payload. Fetching it once here and sharing it means moving
 * between those screens costs no extra requests, while any change made through a
 * form can refresh every screen at once by calling refresh().
 */
const AnalyticsContext = createContext(null);

export function AnalyticsProvider({ children }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const loadedOnce = useRef(false);

  const load = useCallback(async () => {
    // Keep the previous render on screen during a refetch — no skeleton flash
    if (loadedOnce.current) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const response = await getAnalytics();
      setData(response.data);
      loadedOnce.current = true;
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AnalyticsContext.Provider value={{ data, loading, refreshing, error, refresh: load }}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (!context) throw new Error('useAnalytics must be used inside an AnalyticsProvider');
  return context;
}
