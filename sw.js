const filesToCache = [
  '/',
  'restaurant.html',
  'manifest.json',
  'img/icon.png',
  'css/styles.css',
  'img/1.jpg',
  'img/2.jpg',
  'img/3.jpg',
  'img/4.jpg',
  'img/5.jpg',
  'img/6.jpg',
  'img/7.jpg',
  'img/8.jpg',
  'img/9.jpg',
  'img/10.jpg',
  'js/main.js',
  'js/dbhelper.js',
  'js/restaurant_info.js'
];

const cacheName = 'mws-restaurant-cache';

// Listen for install event, then download initial assets
self.addEventListener('install', function(event) {
  console.log('Installing service worker and downloading initial assets...');
  event.waitUntil(caches.open(cacheName)
    .then(function(cache) {
      return cache.addAll(filesToCache);
    })
  );
});

// Listen for activation
self.addEventListener('activate', function (event) {
  console.log('Activating new service worker...');
  const cacheWhitelist = [cacheName];
  event.waitUntil(caches.keys()
    .then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Listen for fetch event then cache
self.addEventListener('fetch', function(event) {
  // Don't cache bloated Google Maps files
  if((event.request.url.indexOf('googleapis') == -1)
  && (event.request.url.indexOf('gstatic') == -1)
  // Don't cache reviews JSON
  && (event.request.url.indexOf('reviews')) == -1) {
    // Remove query string from URL
    const cleanedURL = event.request.url.replace(/[\\?].*/g,'');
    
    console.log(`FETCH: ${cleanedURL}`);
    event.respondWith(
      caches.match(cleanedURL).then(function(response) {
        if (response) {
          console.log(`Retrieving ${cleanedURL} from cache...`);
          return response;
        }
        console.log(`Requesting ${cleanedURL} from network...`);
        return fetch(cleanedURL).then(function(response) {
          return caches.open(cacheName).then(function(cache) {
            cache.put(cleanedURL, response.clone());
            return response;
          });
        });
      }).catch(function(error) {
        console.log(`ERROR: ${error}`);
      })
    );
  }
});
