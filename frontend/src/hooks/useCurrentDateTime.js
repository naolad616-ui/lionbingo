import { useEffect, useState } from 'react';

function formatDateTime(date) {
  return date.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function useCurrentDateTime() {
  const [dateTime, setDateTime] = useState(() => formatDateTime(new Date()));

  useEffect(() => {
    const interval = setInterval(() => {
      setDateTime(formatDateTime(new Date()));
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return dateTime;
}
