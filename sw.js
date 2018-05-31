const filesToCache = [
  '/',
  'restaurant.html',
  'css/styles.css',
  'data/restaurants.json',
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
    && (event.request.url.indexOf('gstatic') == -1)) {
    console.log(`FETCH: ${event.request.url}`);
    event.respondWith(
      caches.match(event.request).then(function(response) {
        if (response) {
          console.log(`Retrieving ${event.request.url} from cache...`);
          return response;
        }
        console.log(`Requesting ${event.request.url} from network...`);
        return fetch(event.request).then(function(response) {
          return caches.open(cacheName).then(function(cache) {
            cache.put(event.request.url, response.clone());
            return response;
          });
        });
      }).catch(function(error) {
        console.log(`ERROR: ${error}`);
      })
    );
  }
});
