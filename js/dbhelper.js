/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL for restaurants.
   */
  static get RESTAURANTS_URL() {
    const port = 1337
    return `http://localhost:${port}/restaurants`;
  }

  /**
   * Database URL for reviews.
   */
  static get REVIEWS_URL() {
    const port = 1337;
    return `http://localhost:${port}/reviews`;
  }

  /**
   * Database URL for favorites.
   */
  static get FAVORITES_URL() {
    const port = 1337;
    return `http://localhost:${port}/restaurants/?is_favorite=true`;
  }

  static openDatabase(type) {
    // If the browser doesn't support service worker,
    // we don't care about having a database
    if (!navigator.serviceWorker) {
      return Promise.resolve();
    }

    return idb.open(`${type}DB`, 1, function(upgradeDb) {
      const store = upgradeDb.createObjectStore(type, {
        keyPath: 'id'
      });
      /* sort restaurants in the database by ID */
      store.createIndex('by-id', 'id');
    });
  }

  static saveToDatabase(data, type){
    return DBHelper.openDatabase(type).then(function(db){
      /* stop if idb isn't supported */
      if(!db) return;

      const tx = db.transaction(type, 'readwrite');
      const store = tx.objectStore(type);
      data.forEach(function(item){
        store.put(item);
      });
      return tx.complete;
    });
  }

  static getDB(type) {
    return DBHelper.openDatabase(type).then(function(db){
      /* stop if idb isn't supported */
      if(!db) return;

      const store = db.transaction(type).objectStore(type);
      return store.getAll();
    });
  }

  static removeFromDB(data, type) {
    return DBHelper.openDatabase(type).then(function(db){
      /* stop if idb isn't supported */
      if(!db) return;

      const tx = db.transaction(type, 'readwrite');
      const store = tx.objectStore(type);
      data.forEach(function(item){
        store.delete(item.id);
      });
      return tx.complete;
    });
  }

  static saveFromAPI(type) {
    function saveData (items) {
      DBHelper.saveToDatabase(items, type);
      return Promise.resolve(items);
    }
    if (type == 'restaurants') {
      return fetch(DBHelper.RESTAURANTS_URL)
        .then(response => {
          return response.json()
        })
        .then(response => {
          saveData(response)
        });
    }
    if (type == 'reviews') {
      return fetch(DBHelper.REVIEWS_URL)
        .then(response => {
          return response.json()
        })
        .then(response => {
          saveData(response)
        });
      }
    if (type == 'favorites') {
      return fetch(DBHelper.FAVORITES_URL)
        .then(response => {
          return response.json()
        })
        .then(response => {
          saveData(response)
        });
    }
  }

  /**
   * Fetch all restaurant reviews.
   */
  static fetchAllRestaurantReviews() {
    return DBHelper.getDB('reviews').then(reviews => {
      if (reviews.length) {
        return Promise.resolve(reviews);
      } else {
        return DBHelper.saveFromAPI('reviews');
      }
    }).catch(err => console.error(err));
  }

  /**
   * Fetch all favorites.
   */
  static fetchAllFavorites() {
    return DBHelper.getDB('favorites').then(favs => {
      if (favs.length) {
        return Promise.resolve(favs);
      } else {
        return DBHelper.saveFromAPI('favorites');
      }
    }).catch(err => console.error(err));
  }

  /**
   * Returns true if favorited.
   */
  static isFavorite(id) {
    return DBHelper.getDB('favorites').then(favs => {
      if (favs.filter(r => r.id == id).length == 1) {
        return Promise.resolve(true);
      } else {
        return Promise.resolve(false);
      }
    }).catch(err => console.error(err));
  }

  /**
   * Fetch a particular restaurant's reviews.
   */
  static fetchRestaurantReviews(id) {
    return DBHelper.getDB('reviews').then(reviews => {
      // Filter reviews by the restaurant id
      return Promise.resolve(reviews.filter(r => r.restaurant_id == id));
    })
  }

  /**
   * Fetch a particular restaurant's reviews.
   */
  static stageReviewForPosting(data) {
    return DBHelper.openDatabase('reviews-stash').then(function(db){
      /* stop if idb isn't supported */
      if(!db) return;

      const arr = [data];
      DBHelper.saveToDatabase(arr, 'reviews');

      const tx = db.transaction('reviews-stash', 'readwrite');
      const store = tx.objectStore('reviews-stash');

      console.log(`staging ${JSON.stringify(data)} for posting...`);
      store.put(data).catch(err => console.error(err));
      return tx.complete;
    });
  }

  /**
   * Sync any staged reviews to server.
   */
  static sync(item) {
    return DBHelper.getDB('reviews-stash').then(reviews => {
      if (reviews.length) {
        reviews.forEach(function(item){
          let json = JSON.stringify(item);
          console.log(`submitting ${json} to server...`);
          fetch(DBHelper.REVIEWS_URL, {
            method: 'post',
            body: JSON.stringify(item)
          }).then(res => {
            const obj = {
              id : item.id
            }
            DBHelper.removeFromDB([obj], 'reviews-stash');
          })
          .catch(err => console.error(err));
        });
      } else {
        console.log('nothing to sync!');
      }
    });
  }

  /**
   * Toggle if restaurant id is favorited locally.
   */
  static toggleFavorite(id) {
    // Filter favorites by the restaurant id
    return DBHelper.isFavorite(id).then(status => {
      if (status == true) {
        DBHelper.updateFavoriteOnServer(id, false);

        DBHelper.fetchRestaurantById(id, (error, restaurant) => {
          const arr = [restaurant];
          DBHelper.removeFromDB(arr, 'favorites');
          if (!restaurant) {
            console.error(error);
            return;
          }
        });
      } else {
        DBHelper.updateFavoriteOnServer(id, true);

        DBHelper.fetchRestaurantById(id, (error, restaurant) => {
          const arr = [restaurant];
          DBHelper.saveToDatabase(arr, 'favorites');
          if (!restaurant) {
            console.error(error);
            return;
          }
        });
      }
    });
  }

  /**
   * Toggle restaurant id favorite on server.
   */
  static updateFavoriteOnServer(id, fav) {
    console.log(`toggling ${id} to ${fav}`);
    fetch(`http://localhost:1337/restaurants/${id}/?is_favorite=${fav}`, {
      method: 'post',
    }).catch(err => console.error(err));
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    return DBHelper.getDB('restaurants').then(restaurants => {
      if(restaurants.length) {
        callback(null, restaurants);
      } else {
        return DBHelper.saveFromAPI('restaurants');
      }
    }).catch(error => {
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
    // Fetch all restaurants with proper error handling
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

  /**
   * Favorite button.
   */
  static createFavButton(element, id) {
    const favButton = element;
    favButton.className ='fav-button';
    favButton.setAttribute('type', 'button');
    favButton.innerHTML = '☆';
    favButton.dataset.id = id;

    DBHelper.isFavorite(id).then(status => {
      if (status == true) {
        favButton.className = favButton.classList + ' fav';
        favButton.innerHTML = '★';
      }
    });

    favButton.onclick = () => {
      DBHelper.toggleFavorite(favButton.dataset.id);
      
      if (favButton.classList.length === 1) {
        favButton.innerHTML = '★';
        favButton.className = favButton.classList + ' fav';
      } else {
        favButton.className ='fav-button';
        favButton.innerHTML = '☆';
      }
    }
    return favButton;
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
