/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL is API endpoint of server.
   */
  static get DATABASE_URL() {
    const port = 1337
    return `http://localhost:${port}/restaurants`;
  }

  static openDatabase() {
    // If the browser doesn't support service worker,
    // we don't care about having a database
    if (!navigator.serviceWorker) {
      return Promise.resolve();
    }

    return idb.open('restaurantDB', 1, function(upgradeDb) {
      const store = upgradeDb.createObjectStore('restaurants', {
        keyPath: 'id'
      });
      /* sort restaurants in the database by ID */
      store.createIndex('by-id', 'id');
    });
  }

  static saveToDatabase(data){
    return DBHelper.openDatabase().then(function(db){
      /* stop if idb isn't supported */
      if(!db) return;

      const tx = db.transaction('restaurants', 'readwrite');
      const store = tx.objectStore('restaurants');
      data.forEach(function(restaurant){
        store.put(restaurant);
      });
      return tx.complete;
    });
  }

  static getStoredRestaurants() {
    return DBHelper.openDatabase().then(function(db){
      /* stop if idb isn't supported */
      if(!db) return;

      const store = db.transaction('restaurants').objectStore('restaurants');
      return store.getAll();
    });
  }

  static saveRestaurantsFromAPI(){
    return fetch(DBHelper.DATABASE_URL)
      .then(function(response){
        return response.json();
    }).then(restaurants => {
      DBHelper.saveToDatabase(restaurants);
      return restaurants;
    });
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    return DBHelper.getStoredRestaurants().then(restaurants => {
      if(restaurants.length) {
        return Promise.resolve(restaurants);
      } else {
        return DBHelper.saveRestaurantsFromAPI();
      }
    })
    .then(restaurants=> {
      callback(null, restaurants);
    })
    .catch(error => {
      callback(error, null);
    })
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // Fetch all restaurants with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    if (restaurant.photograph) {
      return (`/img/${restaurant.photograph}.jpg`);
    } else {
      /* fall back on restaurant ID if no photograph is defined */
      return (`/img/${restaurant.id}.jpg`);
    }
  }

  /**
   * Restaurant image alt text.
   */
  static imageAltForRestaurant(restaurant) {
    /* generate alt text of restaurant photos based on their properties */
    return (`Photo of ${restaurant.name} in ${restaurant.neighborhood}.`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  }

}

/**
 * Register the service worker.
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js')
      .then(function(registration) {
        console.log(`Service worker registered successfully with scope: ${registration.scope}`);
      }).catch(function(error) {
        console.log(`Service worker failed to register: ${error}`);
      })
  });
}
