(function ($) {
  //Initially hide all conditional items on the results page
  $(".result-yes").hide();
  $(".result-no").hide();
  $(".main-reason-wrapper").hide();
  $(".weather-warning").hide();
  $(".weather-warning-results").hide();
  $(".explanation").hide();

  //Setup brick components
  document.addEventListener('DOMComponentsLoaded', function(){
    $(".settings-link").click(function(e) {
      e.preventDefault();

      $(".result-yes").hide();
      $(".result-no").hide();
      $(".main-reason-wrapper").hide();
      $(".weather-warning").hide();
      $(".weather-warning-results").hide();
      $(".explanation").hide();

      toggle_settings_icon();

      //Using jQuery for this selector breaks the Brick functions, as it attempts to use the jQuery toggle instead
      var deck = document.querySelector( "x-deck" );
      var currentCard = deck.getCardIndex(deck.getSelectedCard());
      if (currentCard != 1 && currentCard != 3) {
        deck.shuffleTo(1);
      } else {
        deck.shuffleTo(0);
      }
    });
  });

  if (localStorage) {
    //User has local storage available, show settings form
    $("form.settings-form").show();
    $(".no-local-storage").hide();

    //Grab any existing form settings
    asyncStorage.getItem('temp-threshold-cold', function(value){
      if (value != '') {
        $("#temp-threshold-cold").val(value);
      }
    });

    asyncStorage.getItem('temp-threshold-heat', function(value){
      if (value != '') {
        $("#temp-threshold-heat").val(value);
      }
    });

    asyncStorage.getItem('weather-tolerance', function(value){
      if (value != '') {
        $("#weather-tolerance").val(value);
      }
    });
  } else {
    //Users device or browser does not support local storage, so they cannot use the settings form
    $("form.settings-form").hide();
    $(".no-local-storage").show();
  }

  //Setup an onclick event for the main submit button
  $("#submit").click(function(e) {
    e.preventDefault();
    var location = $("#location").val();
    make_wunderground_request(location);
  });

  //Setup an onclick event for the location select submit button
  $("#location-select-submit").click(function(e) {
    e.preventDefault();
    var location = $("#location-select").val();
    make_wunderground_request(location);

  });

  //Setup a click handler for the save settings button - on click, save the state of the settings form to local storage
  $("#settings-submit").click(function(e) {
    e.preventDefault();
    //Grab the form values
    var tempThresholdCold = $("#temp-threshold-cold").val();
    var tempThresholdHeat = $("#temp-threshold-heat").val();
    var weatherTolerance = $("#weather-tolerance").val();

    //Save the settings for later use
    asyncStorage.setItem('temp-threshold-cold', tempThresholdCold);
    asyncStorage.setItem('temp-threshold-heat', tempThresholdHeat);
    asyncStorage.setItem('weather-tolerance', weatherTolerance);

    alert("Settings saved!");

    //Trigger the shuffle to take the user back to the main page
    //First, set the settings icon correctly
    toggle_settings_icon();
    var deck = document.querySelector( "x-deck" );
    deck.shuffleTo(0);
  });

  //Setup a click handler for the explanation button on the results page
  $(".explanation-btn").click(function(e) {
    e.preventDefault();

    //Toggle the display of the explanation
    $(".explanation").toggle();
  })

  /**
   * Checks if the localStorage API is available or not
   * @returns {boolean} True if the browser can use localStorage
   */
  function supports_html5_storage() {
    try {
      return 'localStorage' in window && window['localStorage'] !== null;
    } catch (e) {
      return false;
    }
  }

  /**
   * Toggles the settings icon based on its current state
   */
  function toggle_settings_icon() {

    var settingsButton = $('.settings-link span');

    if (settingsButton.hasClass("glyphicon-cog")) {
      settingsButton.removeClass("glyphicon-cog");
      settingsButton.addClass("glyphicon-home");
    } else {
      settingsButton.removeClass("glyphicon-home");
      settingsButton.addClass("glyphicon-cog");
    }
  }

  /**
   * Make a request to the wunderground service
   * @param location The location to return weather information for
   */
  function make_wunderground_request(location) {
    var deck = document.querySelector( "x-deck" );
    $.ajax({
      url : "http://api.wunderground.com/api/" + config.wu_api_key + "/geolookup/conditions/q/" + location + ".json",
      dataType : "jsonp",
      success : function(parsed_json) {
        //Check to see if there are multiple locations returned. If there are, show the select location card
        if (parsed_json['response']['results']) {
          var locationSelect = $("#location-select");
          locationSelect.empty();
          $.each(parsed_json['response']['results'], function (index, value) {
            var location = value.name + ', ' + value.state + ', ' + value.country;
            locationSelect.append('<option value="'+value.zmw+'">' + location + '</option>');
          });

          deck.shuffleTo(2);
        } else {
          var location = parsed_json['location']['city'];
          var temp_f = parsed_json['current_observation']['temp_f'];

          //Change cards to the results card
          deck.shuffleTo(3);

          //Do some very simple testing of the temp data against the set threshold, if available
          calculate_results(parsed_json);
        }
      },
      error : function(e) {
        alert('Request failed...');
      }
    });
  }

  /**
   * Analyzes all the weather data returned, and makes a decision based on it
   * @param weather_json The parsed json repsonse from the weather underground servers
   */
  function calculate_results(weather_json) {
    //Toggle the options button to the home button
    toggle_settings_icon();

    //Set up a negative tracker object. This will keep track of the various aspects weighing the overall
    //decision
    var negatives = {"major": {}, "minor": {}};

    //Grab any relevant temperature data from the weather response
    var curTemp = weather_json['current_observation']['temp_f'];
    var feelsLike = weather_json['current_observation']['feelslike_f'];

    //Grab the temperature threshold that the user has set. if it is not set, temperature will not be a major factor
    //(It can still be a minor factor if the temperature is very hot or very cold)
    var tempThresholdCold = -50;
    var tempThresholdHeat = 150;

    //Set the thresholds for heat and cold, and figure out any notifications. This needs to be done asyncrhonously,
    //as the localstorage library is async.
    asyncStorage.getItem('temp-threshold-cold', function(value){
      if (value != '') {
        tempThresholdCold = value;
      }
      //Get the heat threshold in the same same callback
      asyncStorage.getItem('temp-threshold-heat', function(value){
        if (value != '') {
          tempThresholdHeat = value;
        }
        //And, heres where it gets hacky...run the rest of the code as part of this callback, so the async stuff is
        //guaranteed to be finished
        negatives = decide_if_cold(negatives, tempThresholdCold, curTemp);
        negatives = decide_if_hot(negatives, tempThresholdHeat, curTemp);

        //Next up, figure out what the current weather looks like
        var currentWeather = weather_json['current_observation']['weather'];
        var predictedPrecip = weather_json['current_observation']['precip_today_in'];
        console.log(predictedPrecip);

        //Change out the weather icon based on the current forecast
        var weatherIcon = $(".weather-icon");

        //Also check precipitation
        //Major notification if more than a half inch of precip
        //Minor notification if any precip
        switch (currentWeather) {
          case 'Light Snow':
            weatherIcon.attr('src', 'images/weather-icons/snow.png');
            if (predictedPrecip > 0 && predictedPrecip < 0.50) {
              negatives['minor']['precip'] = predictedPrecip;
            } else if(predictedPrecip >= 0.50) {
              negatives['major']['precip'] = predictedPrecip;
            }
            break;
          case 'Snow':
            weatherIcon.attr('src', 'images/weather-icons/snow.png');
            if (predictedPrecip > 0 && predictedPrecip < 0.50) {
              negatives['minor']['precip'] = predictedPrecip;
            } else if(predictedPrecip >= 0.50) {
              negatives['major']['precip'] = predictedPrecip;
            }
            break;
          case 'Mostly Cloudy':
            weatherIcon.attr('src', 'images/weather-icons/overcast.png');
            if (predictedPrecip > 0 && predictedPrecip < 0.50) {
              negatives['minor']['precip'] = predictedPrecip;
            } else if(predictedPrecip >= 0.50) {
              negatives['major']['precip'] = predictedPrecip;
            }
            break;
          case 'Overcast':
            weatherIcon.attr('src', 'images/weather-icons/overcast.png');
            if (predictedPrecip > 0 && predictedPrecip < 0.50) {
              negatives['minor']['precip'] = predictedPrecip;
            } else if(predictedPrecip >= 0.50) {
              negatives['major']['precip'] = predictedPrecip;
            }
            break;
          case 'Light Rain':
            weatherIcon.attr('src', 'images/weather-icons/rain.png');
            if (predictedPrecip > 0 && predictedPrecip < 0.50) {
              negatives['minor']['precip'] = predictedPrecip;
            } else if(predictedPrecip >= 0.50) {
              negatives['major']['precip'] = predictedPrecip;
            }
            break;
          case 'Clear':
            break;
        }

        var hikable = true;

        //Tally up the negatives and make a decision
        //Major negatives will result in a negative result
        //Minor negatives will result in warnings, and if there are enough of them, a negative result
        if (Object.keys(negatives["major"]).length > 0) {
          $(".main-reason-wrapper").show();
          $(".main-reason-wrapper .main-reason").empty();
          for (var notification in negatives['major']) {
            console.log(notification);
            switch (notification) {
              case 'temperature-cold':
                var coldAmount = negatives['major'][notification];
                $(".main-reason").append('<li>It\'s going to be too cold! Specifically, about ' + curTemp + 'F.</li>');
                break;
              case 'temperature-heat':
                var heatAmount = negatives['major'][notification];
                $(".main-reason").append('<li>It\'s going to be hot! Specifically, about ' + curTemp + 'F.</li>');
                break;
              case 'precip':
                var precipAmount = negatives['major'][notification];
                $(".main-reason").append('<li>Things are going to be wet. There\'s about  ' + precipAmount + ' predicted.</li>');
                break;
            }
          }
          negatives['major'] = {};
          //A mojor notification was found, probably shouldn't go hiking
          hikable = false;
        }

        if (Object.keys(negatives['minor']).length > 0) {
          $(".weather-warning").show();
          $(".weather-warning-results").show();
          $(".weather-warning-results .weather-warnings .warnings-list").empty();
          for (var notification in negatives['minor']) {
            switch (notification) {
              case 'temperature-cold':
                var coldAmount = Math.round(negatives['minor'][notification] * 100) / 100;
                $(".warnings-list").append('<li>It\'s supposed to colder than you prefer by about ' + coldAmount +
                  ' degrees (' + curTemp + 'F)</li>');
                break;
              case 'temperature-heat':
                var heatAmount = Math.round(negatives['minor'][notification] * 100) / 100;
                $(".warnings-list").append('<li>It\'s supposed to hotter than you prefer by about ' + heatAmount +
                  'degrees (' + curTemp + 'F)</li>');
                break;
              case 'precip':
                var precipAmount = negatives['minor'][notification];
                $(".warnings-list").append('<li>There\'s a fair chance of precipitation, with about ' + precipAmount + ' predicted.</li>');
                break;
            }
          }
          negatives['minor'] = {};
          //Check to see how many minor notifications there are. If there are too many, probably shouldn't go hiking
          if (Object.keys(negatives['minor']).length > 2) {
            hikable = false;
          }
        }

        //Finally, determine what message to show, in terms of hiking
        if (hikable) {
          $(".result-yes").show();
        } else {
          $(".result-no").show();
        }
      });
    });
  }

  /**
   * Decide what notifications to set for cold temperatures
   * @param negatives The negatives notifications object
   * @param tempThresholdCold
   * @param curTemp
   * @returns {*} The modified negatives notifications object
   */
  function decide_if_cold(negatives, tempThresholdCold, curTemp) {
    if (tempThresholdCold == -50) {
      //If the user has not set a threshold, 32F is used as the basepoint for a cold temp
      tempThresholdCold = 32;
    }
    //Calculate the temperature difference between the temp thresholds and the current.
    //Major notification if it is more than 10 degrees below or above the threshold
    //Minor notification if it is between 1 and 9 degrees below or above the threshold
    var tempDifferenceCold = tempThresholdCold - curTemp;

    //Check cold temps first
    if (tempDifferenceCold > 0) {
      if (tempDifferenceCold >= 10) {
        negatives['major']['temperature-cold'] = tempDifferenceCold;
      } else {
        negatives['minor']['temperature-cold'] = tempDifferenceCold;
      }
    }

    return negatives;
  }

  /**
   * Decide what notifications to set for hot temperatures
   * @param negatives The negatives notifications object
   * @param tempThresholdHeat
   * @param curTemp
   * @returns {*} The modified negatives notifications object
   */
  function decide_if_hot(negatives, tempThresholdHeat, curTemp) {
    if (tempThresholdHeat == 150) {
      //If the user has not set a threshold, 85 is used as the basepoint for a hot temp
      tempThresholdHeat = 85;
    }
    //Calculate the temperature difference between the temp thresholds and the current.
    //Major notification if it is more than 10 degrees below or above the threshold
    //Minor notification if it is between 1 and 9 degrees below or above the threshold
    var tempDifferenceHeat = tempThresholdHeat - curTemp;

    //Then check hot temps
    if (tempDifferenceHeat < 0) {
      if (tempDifferenceHeat <= -10) {
        negatives['major']['temperature-heat'] = tempDifferenceHeat;
      } else {
        negatives['minor']['temperature-heat'] = tempDifferenceHeat;
      }
    }

    return negatives;
  }
})(jQuery);
