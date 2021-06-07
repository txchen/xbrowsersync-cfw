// settings
const createNewBookmarksEnabled = true
// end of settings

// KV binding XBSKV must be available
if (typeof XBSKV === 'undefined') {
  addEventListener('fetch', event => {
    event.respondWith(
      new Response(
        'XBSKV is not defined, please check KV Namespace Bindings.',
        { status: 500 },
      ),
    )
  })
} else {
  addEventListener('fetch', event => {
    event.respondWith(
      handleRequest(event.request).catch(
        err => new Response(err.stack, { status: 500 }),
      ),
    )
  })
}

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
const handleRequest = async request => {
  const { pathname } = new URL(request.url)

  // service info
  if (pathname === '/info') {
    return handleServiceInfo()
  }

  // bookmarks apis
  if (pathname.startsWith('/bookmarks')) {
    const paths = pathname
      .replace('/bookmarks', '')
      .split('/')
      .filter(p => p)

    if (request.method === 'POST' && paths.length === 0) {
      return await handlePostBookmarks(await request.json())
    }

    if (request.method === 'PUT' && paths.length === 1) {
      return await hanldePutBookmarks(paths[0], await request.json())
    }

    if (request.method === 'GET' && paths.length >= 1) {
      return await handleGetBookmarks(paths)
    }
  }

  return new Response('not found', { status: 404 })
}

const jsonToResponse = json => {
  return new Response(JSON.stringify(json), {
    headers: { 'Content-Type': 'application/json' },
  })
}

const handleServiceInfo = () => {
  return jsonToResponse({
    maxSyncSize: 104857600,
    message: 'Welcome to xbrowsersync-cfw.',
    status: createNewBookmarksEnabled ? 1 : 3,
    version: '1.1.13',
  })
}

const handlePostBookmarks = async jsonBody => {
  if (!createNewBookmarksEnabled) {
    return new Response('bookmarks creation disabled', { status: 400 })
  }
  if (jsonBody.version == null) {
    return new Response('missing version input', { status: 400 })
  }
  // set version and lastUpdated to KV
  const bid = hexUUID()
  const lastUpdated = new Date().toISOString()
  await XBSKV.put(`${bid}_version`, jsonBody.version)
  await XBSKV.put(`${bid}_lastUpdated`, lastUpdated)
  return jsonToResponse({
    id: bid,
    lastUpdated,
    version: jsonBody.version,
  })
}

const hanldePutBookmarks = async (bid, jsonBody) => {
  if (!jsonBody.bookmarks) {
    return new Response('missing bookmarks input', { status: 400 })
  }
  if (!jsonBody.lastUpdated) {
    return new Response('missing lastUpdated input', { status: 400 })
  }
  const lastUpdatedInDB = await XBSKV.get(`${bid}_lastUpdated`)
  if (lastUpdatedInDB !== jsonBody.lastUpdated) {
    return new Response('A sync conflict was detected', { status: 400 })
  }
  const newLastUpdated = new Date().toISOString()
  await XBSKV.put(`${bid}`, jsonBody.bookmarks)
  await XBSKV.put(`${bid}_lastUpdated`, newLastUpdated)
  return jsonToResponse({ lastUpdated: newLastUpdated })
}

const handleGetBookmarks = async paths => {
  const lastUpdated = await XBSKV.get(`${paths[0]}_lastUpdated`)
  if (paths.length >= 2 && paths[1] === 'lastUpdated') {
    return jsonToResponse({ lastUpdated })
  }
  const version = await XBSKV.get(`${paths[0]}_version`)
  if (paths.length >= 2 && paths[1] === 'version') {
    return jsonToResponse({ version })
  }
  const result = {
    version,
    lastUpdated,
  }
  const bookmarks = await XBSKV.get(`${paths[0]}`)
  if (bookmarks) {
    result.bookmarks = bookmarks
  }
  return jsonToResponse(result)
}

const hexUUID = () => {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return [...arr].map(x => x.toString(16).padStart(2, '0')).join('')
}
