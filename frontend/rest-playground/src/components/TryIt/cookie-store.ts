type CookieOptions = Partial<{
  path: string;
  maxAge: number;
  domain: string;
}>;

export class CookieStore {
  static set(name: string, value: string, options: CookieOptions = {}) {
    let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

    if (options.path) cookie += `; path=${options.path}`;
    if (options.maxAge) cookie += `; max-age=${options.maxAge}`;
    if (options.domain) cookie += `; domain=${options.domain}`;

    document.cookie = cookie;
  }

  static clear(name: string, options: CookieOptions = {}) {
    // eslint-disable-next-line prettier/prettier
    let cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;

    if (options.path) cookie += `; path=${options.path}`;
    if (options.domain) cookie += `; domain=${options.domain}`;

    document.cookie = cookie;
  }

  static get(name: string): string | null {
    const cookies = document.cookie.split("; ");
    for (const cookie of cookies) {
      const [cookieName, cookieValue] = cookie.split("=");
      if (decodeURIComponent(cookieName) === name) {
        return decodeURIComponent(cookieValue);
      }
    }
    return null;
  }
}
