(function ($) {
    /*
        WebActivities:

            configure
            costcontrol/balance
            costcontrol/data_usage
            costcontrol/telephony
            dial
            new (type: "websms/sms", "webcontacts/contact") (add-contact, compose-mail?)
            open
            pick (type: "image/png" etc)
            record (capture?)
            save-bookmark
            share
            test
            view (type: "url" etc. "text/html"?)
    */

  //Setup an onclick event for the submit button
  $("#submit").click(function() {
    $.ajax({
      url : "http://api.wunderground.com/api/" + config.wu_api_key + "/geolookup/conditions/q/IA/Cedar_Rapids.json",
      dataType : "jsonp",
      success : function(parsed_json) {
        var location = parsed_json['location']['city'];
        var temp_f = parsed_json['current_observation']['temp_f'];
        alert("Current temperature in " + location + " is: " + temp_f);
      }
    });
  })
})(jQuery);
