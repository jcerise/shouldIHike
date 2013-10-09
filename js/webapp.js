(function ($) {
  //Setup brick components
  document.addEventListener('DOMComponentsLoaded', function(){
    $(".settings-link").click(function(e) {
      e.preventDefault();
      //Using jQuery for this selector breaks the Brick functions, as it attempts to use the jQuery toggle instead
      var flipBox = document.querySelector( "x-flipBox" );
      flipBox.toggle();
    });
  });

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
        alert("Current temperature in " + location + " is: " + temp_f);
      },
      error : function(e) {
        alert('Request failed...');
      }
    });
  })
})(jQuery);
