import { useCallback } from "react";

export default function useFetch() {
  const fetch = useCallback((path, options) => {
    const method = options?.method || 'GET';
    const body = options?.body;

    return new Promise(async (resolve, reject) => {
      try {
        const res = await window.fetch(path, {
          body: body ? JSON.stringify(body) : undefined,
          headers: options?.headers,
          method
        });

        let json;

        try {
          json = await res.json();
        } catch {}

        if (res.status < 400) {
          resolve({
            status: res.status,
            body: json
          });
        } else {
          reject(json?.message || '')
        }
      } catch(e) {
        reject(e);
      }
    });
  }, []);

  return fetch;
}