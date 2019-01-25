// SW Version
const version = '1.1';

// Static Cache - App Shell
const appAssets = [
    'index.html',
    'main.js',
    'images/flame.png',
    'images/logo.png',
    'images/sync.png',
    'vendor/bootstrap.min.css',
    'vendor/jquery.min.js'
];

// SW Install
self.addEventListener( 'install', e => {

    e.waitUntil(
        // Cache all assets
        caches.open( `static-${version}` )
        .then( cache => cache.addAll(appAssets) )
    );

});

// SW Activate
self.addEventListener( 'activate', e => {

    // Clean old versions of the static cache.
    let cleaned = caches.keys().then( keys => {

        // Each cache key.
        keys.forEach( key => {

            // If the cache is not the current cache, but an old cache.
            if ( key !== `static-${version}` && key.match('static-') ) {

                // Returns a promise.
                return caches.delete(key);
            }
        });
    });

    // Wait until the cleaned promises are complete.
    e.waitUntil(cleaned);

});

// Static cache strategy - Cache with Network Fallback.
const staticCache = ( req, cacheName = `static-${version}` ) => {

    return caches.match(req).then( cachedRes => {

        // Return caches response if found
        if (cachedRes) return cachedRes;

        // Fallback to network.
        return fetch(req).then( networkRes => {

            // Update cache with new network response.
            caches.open(cacheName)
            .then( cache => cache.put( req, networkRes ));

            // Return cloned network response.
            return networkRes.clone();
        });
    });

};

// Network with Cache Fallback
const fallbackCache = (req) => {

    // Try network
    return fetch(req).then( networkRes => {

        // Check networkRes is OK, else fallback to cache.
        if ( !networkRes.ok ) throw 'Fetch Error';

        // Update cache with latest network data.
        caches.open( `static-${version}` )
        .then( cache => cache.put(req, networkRes) );

        // Return clone of network response.
        return networkRes.clone();
    })
    // Try cache.
    .catch( err => caches.match(req) );
};

// Clean old Giphy images from the `giphy` cache.
const cleanGiphyCache = (giphys) => {

    caches.open('giphy').then( cache => {

        // Get all image cache entries.
        cache.keys().then( keys => {
            keys.forEach( key => {
                // If image entry is NOT part of the current trending images, delete it.
                if ( !giphys.includes(key.url) ) cache.delete(key);
            });
        });
    });
};

// SW Fetch
self.addEventListener( 'fetch', e => {

    if ( e.request.url.match(location.origin) ) {
        // App Shell
        e.respondWith( staticCache(e.request) );
    }
    else if ( e.request.url.match('api.giphy.com/v1/gifs/trending' ) ) {
        // Giphy API
        e.respondWith( fallbackCache(e.request) );
    }
    else if ( e.request.url.match('giphy.com/media' ) ) {
        // Giphy Media Images
        // Cache in separate cache so they persist across service worker updates.
        // The versioned cache is cleaned on service updates, whereas the
        // `giphy` cache will not.
        e.respondWith( staticCache(e.request, 'giphy') );
    }

});

// Listener for message from client (main.js)
self.addEventListener( 'message', e => {
    if ( e.data.action === 'cleanGiphyCache' ) cleanGiphyCache(e.data.giphys);
});