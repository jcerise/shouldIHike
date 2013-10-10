(function ($) {
  //Setup brick components
  document.addEventListener('DOMComponentsLoaded', function(){
    $(".settings-link").click(function(e) {
      e.preventDefault();

      if ($('span', this).hasClass("glyphicon-cog")) {
        $('span', this).removeClass("glyphicon-cog");
        $('span', this).addClass("glyphicon-home");
      } else {
        $('span', this).removeClass("glyphicon-home");
        $('span', this).addClass("glyphicon-cog");
      }

      //Using jQuery for this selector breaks the Brick functions, as it attempts to use the jQuery toggle instead
      var flipBox = document.querySelector( "x-flipBox" );
      flipBox.toggle();
    });
  });

  //check for local storage
  var localStorage = supports_html5_storage();

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

  //Setup an onclick event for the submit button
  $("#submit").click(function(e) {
    e.preventDefault();
    var location = $("#location").val();
    $.ajax({
      url : "http://api.wunderground.com/api/" + config.wu_api_key + "/geolookup/conditions/q/" + location + ".json",
      dataType : "jsonp",
      success : function(parsed_json) {
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
      },
      error : function(e) {
        alert('Request failed...');
      }
    });
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

    //Trigger the flipbox to take the user back to the main page
    var flipBox = document.querySelector( "x-flipBox" );
    flipBox.toggle();
  })
})(jQuery);

function supports_html5_storage() {
  try {
    return 'localStorage' in window && window['localStorage'] !== null;
  } catch (e) {
    return false;
  }
}
