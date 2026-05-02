export const ROUTES = {
  auth: '/auth',
  generator: '/generator',
}

const routeMap = {
  [ROUTES.auth]: {
    path: ROUTES.auth,
    title: 'Create account',
  },
  [ROUTES.generator]: {
    path: ROUTES.generator,
    title: 'Thumbnail studio',
  },
}

export function normalizePath(pathname) {
  if (!pathname || pathname === '/') return ROUTES.auth
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1)
  }
  return pathname
}

export function getRouteByPath(pathname) {
  return routeMap[normalizePath(pathname)] ?? null
}
