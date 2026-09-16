/**
 * Cookie and LocalStorage synchronization utility for permanent browser persistence
 */

export const setCookie = (name: string, value: string, days: number = 365) => {
  if (typeof document === 'undefined') return;
  try {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = `; expires=${date.toUTCString()}`;
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    // URI encode value to prevent issues with special characters and commas
    document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/; SameSite=Lax${secure}`;
  } catch (err) {
    console.warn(`[CookieStorage] Failed to set cookie ${name}:`, err);
  }
};

export const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  try {
    const nameEQ = `${name}=`;
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        return decodeURIComponent(c.substring(nameEQ.length, c.length));
      }
    }
  } catch (err) {
    console.warn(`[CookieStorage] Failed to get cookie ${name}:`, err);
  }
  return null;
};

export const removeCookie = (name: string) => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
};

/**
 * Universal persistent storage helper:
 * Tenta ler primeiro do LocalStorage; se não achar ou estiver vazio, tenta ler dos Cookies.
 * Ao salvar, salva instantaneamente em AMBOS (LocalStorage e Cookies) com validade de 365 dias.
 */
export const persistentStorage = {
  getItem: (key: string): string | null => {
    // 1. Tenta do LocalStorage
    try {
      const lsVal = localStorage.getItem(key);
      if (lsVal !== null && lsVal !== undefined && lsVal !== '') {
        return lsVal;
      }
    } catch {
      // LocalStorage pode estar desabilitado ou com erro
    }

    // 2. Se não encontrou no LocalStorage, busca no Cookie correspondente
    const cookieVal = getCookie(`pv_${key}`);
    if (cookieVal) {
      // Sincroniza de volta no LocalStorage se possível
      try {
        localStorage.setItem(key, cookieVal);
      } catch {
        // Ignored
      }
      return cookieVal;
    }

    return null;
  },

  setItem: (key: string, value: string) => {
    // Salva no LocalStorage
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignored
    }

    // Salva também no Cookie do navegador com duração de 1 ano
    try {
      setCookie(`pv_${key}`, value, 365);
    } catch {
      // Ignored
    }
  },

  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignored
    }
    try {
      removeCookie(`pv_${key}`);
    } catch {
      // Ignored
    }
  },
};
