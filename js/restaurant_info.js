let restaurant;
var map;

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
}

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = DBHelper.imageAltForRestaurant(restaurant);

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }

  const restaurantContainer = document.getElementById('restaurant-container');

  // add favorite button
  const favButton = DBHelper.createFavButton(document.createElement('button'));
  restaurantContainer.append(favButton);

  // fill reviews
  fillReviewsHTML();

  // review form toggle button
  const reviewFormToggle = document.createElement('button');
  reviewFormToggle.className = 'review-form-toggle';
  reviewFormToggle.setAttribute('type', 'button');
  reviewFormToggle.innerHTML = 'Leave a Review';
  restaurantContainer.append(reviewFormToggle);
  reviewFormToggle.onclick = () => {
    // create review form
    if (document.getElementsByClassName('review-form').length === 0) {
      reviewFormToggle.innerHTML = 'Nevermind?';
      reviewFormToggle.setAttribute('type', 'reset');
      reviewFormToggle.className = reviewFormToggle.classList + ' on';
      reviewForm = document.createElement('div');
      reviewForm.className ='review-form';

      // ** review form title
      const RF_title = document.createElement('h3');
      RF_title.innerHTML = 'Leave a Review';
      reviewForm.appendChild(RF_title);

      // ** review form name
      const RF_nameDiv = document.createElement('div');
      const RF_nameLabel = document.createElement('label');
      RF_nameLabel.setAttribute('for', 'nameInput');
      RF_nameLabel.innerHTML = 'Your Name:';
      const RF_nameInput = document.createElement('input');
      RF_nameInput.id = 'nameInput';
      RF_nameInput.type = 'text';

      RF_nameDiv.append(RF_nameLabel);
      RF_nameDiv.append(RF_nameInput);

      // ** review form rating
      const RF_ratingDiv = document.createElement('div');
      const RF_ratingLabel = document.createElement('label');
      RF_ratingLabel.setAttribute('for', 'ratingSelect');
      RF_ratingLabel.innerHTML = 'Rating:';
      const RF_ratingSelect = document.createElement('select');
      RF_ratingSelect.id = 'ratingSelect';
      for (i = 1; i < 6; i++) {
        const elem = document.createElement('option');
        elem.value = i;
        elem.innerHTML = i;
        RF_ratingSelect.append(elem);
      }

      RF_ratingDiv.append(RF_ratingLabel);
      RF_ratingDiv.append(RF_ratingSelect);
      
      // ** review form comment
      const RF_commentDiv = document.createElement('div');
      const RF_commentLabel = document.createElement('label');
      RF_commentLabel.setAttribute('for', 'commentInput');
      RF_commentLabel.innerHTML = 'Comment:';
      const RF_commentInput = document.createElement('textarea');
      RF_commentInput.id = 'commentInput';
      RF_commentInput.rows = 4;
      RF_commentInput.columns = 50;

      RF_commentDiv.append(RF_commentLabel);
      RF_commentDiv.append(document.createElement('br'));
      RF_commentDiv.append(RF_commentInput);

      // ** review form button
      const RF_submitButton = document.createElement('button');
      RF_submitButton.setAttribute('type', 'submit');
      RF_submitButton.className = 'review-form-submit';
      RF_submitButton.innerHTML = 'Submit';

      // ** build review form
      reviewForm.append(RF_title);
      reviewForm.append(RF_nameDiv);
      reviewForm.append(RF_ratingDiv);
      reviewForm.append(RF_commentDiv);
      reviewForm.append(RF_submitButton);

      // ** add review form to HTML
      restaurantContainer.append(reviewForm);
    } else {
      reviewFormToggle.innerHTML = 'Leave a Review';
      reviewFormToggle.className = 'review-form-toggle';
      reviewFormToggle.setAttribute('type', 'button');
      // otherwise, remove from DOM
      const element = document.getElementsByClassName('review-form')[0];
      element.parentNode.removeChild(element);
    }
  };
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = () => {
  const container = document.getElementById('reviews-container');
  let reviews = [];
  const ul = document.getElementById('reviews-list');
  ul.innerHTML = '';

  DBHelper.fetchRestaurantReviews(self.restaurant.id)
    .then(data => {
      reviews = self.orderByDate(data, 'createdAt');
      if (reviews.length === 0) {
        const noReviews = document.createElement('p');
        noReviews.className = 'no-reviews-yet';
        noReviews.innerHTML = 'No reviews yet!';
        container.appendChild(noReviews);
        return;
      }
      reviews.forEach(review => {
        ul.appendChild(createReviewHTML(review));
      });
      container.appendChild(ul);
    })
    .catch(err => console.error(err));
};

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  
  // Reviewer's name
  const name = document.createElement('p');
  name.className = 'review-name';
  name.innerHTML = review.name;
  li.appendChild(name);

  // Review date
  const date = document.createElement('p');
  const updated = new Date(review.updatedAt).toDateString().split(' ');
  date.innerHTML = updated[1] + ' ' + updated[2] + ', ' + updated[3];
  date.className = 'review-date';
  li.appendChild(date);

  // Reviewer's rating
  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  rating.className = 'review-rating';
  li.appendChild(rating);

  // Reviewer's comments, also allows
  // reviews without comments (just ratings)
  if (review.comments) {
    const comments = document.createElement('p');
    comments.innerHTML = review.comments;
    li.appendChild(comments);
  }

  // Return the constructured review object
  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

// Helper function for ordering reviews by date
orderByDate = (arr, dateProp) => {
  return arr.slice().sort(function(a, b) {
    return arr[dateProp] < b[dateProp] ? -1 : 1;
  });
};
