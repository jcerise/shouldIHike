(function ($) {
  //Setup brick components
  document.addEventListener('DOMComponentsLoaded', function(){
    $(".settings-link").click(function(e) {
      e.preventDefault();

      toggle_settings_icon();

      //Using jQuery for this selector breaks the Brick functions, as it attempts to use the jQuery toggle instead
      var deck = document.querySelector( "x-deck" );
      var currentCard = deck.getCardIndex(deck.getSelectedCard());
      if (currentCard != 1) {
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
    asyncStorage.getItem('temp-threshold', function(value){
      if (value != '') {
        $("#temp-threshold").val(value);
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
    var tempThreshold = $("#temp-threshold").val();
    var weatherTolerance = $("#weather-tolerance").val();

    //Save the settings for later use
    asyncStorage.setItem('temp-threshold', tempThreshold);
    asyncStorage.setItem('weather-tolerance', weatherTolerance);

    alert("Settings saved!");

    //Trigger the shuffle to take the user back to the main page
    //First, set the settings icon correctly
    toggle_settings_icon();
    var deck = document.querySelector( "x-deck" );
    deck.shuffleTo(0);
  });

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

          //Do some very simple testing of the temp data against the set threshold, if available
          asyncStorage.getItem('temp-threshold', function(value) {
            if (value > temp_f) {
              alert('You should probably not go hiking. Its cold there...');
            } else {
              alert('You should go hiking!');
            }
          });

          deck.shuffleTo(0);
        }
      },
      error : function(e) {
        alert('Request failed...');
      }
    });
  }
})(jQuery);
