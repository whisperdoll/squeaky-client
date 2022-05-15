import { useCallback } from "react";
import useFetch from "./useFetch";

const baseUrl = 'http://10.0.0.33:8081';

function transformUrl(url) {
  if (url.startsWith(baseUrl)) {
    url = url.substr(baseUrl.length);
  }

  if (!url.startsWith('/')) {
    url = '/' + url;
  }

  return url;
}

export default function useApi() {
  const fetch = useFetch();

  const get = useCallback((url) => {
    url = transformUrl(url);

    return new Promise(async (resolve, reject) => {
      try {
        const res = await fetch(baseUrl + url);
        resolve(res);
      } catch (e) {
        reject(e);
      }
    })
  }, []);

  const getFile = useCallback(async (url) => {
    url = transformUrl(url);

    const res = await window.fetch(baseUrl + url);

    if (res.status < 400) {
      return res.blob();
    } else {
      throw res.statusText;
    }
  }, []);

  const post = useCallback((url, body) => {
    url = transformUrl(url);

    return new Promise(async (resolve, reject) => {
      try {
        const res = await fetch(baseUrl + url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body
        });

        resolve(res);
      } catch (e) {
        reject(e);
      }
    })
  }, []);

  const patch = useCallback((url, body) => {
    url = transformUrl(url);

    return new Promise(async (resolve, reject) => {
      try {
        const res = await fetch(baseUrl + url, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body
        });

        resolve(res);
      } catch (e) {
        reject(e);
      }
    })
  }, []);

  const del = useCallback((url) => {
    url = transformUrl(url);

    return new Promise(async (resolve, reject) => {
      try {
        const res = await fetch(baseUrl + url, {
          method: 'DELETE'
        });
        
        resolve(res);
      } catch (e) {
        reject(e);
      }
    })
  }, []);

  const filePath = useCallback((url) => {
    url = transformUrl(url);
    
    return baseUrl + url.replace(/\\/g, '/');
  }, []);

  return {
    get,
    getFile,
    post,
    delete: del,
    patch,
    filePath
  };
}