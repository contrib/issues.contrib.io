window.queryVars = {};
window.utils = {};

window.location.search.substring(1).split('&').forEach(function(str){
  if (!str) return;
  str = str.split('=');
  window.queryVars[str[0]] = str[1];
});

window.utils.loading = {
  show: function(text) {
    text = text || 'Loading fresh data';
    $('.reload').removeClass('inactive').addClass('active');
    $('.reload').html('<i class="ion-ios7-reloading"></i>');
  },
  hide: function() {
    $('.reload').removeClass('active').addClass('inactive');
    $('.reload').html('<i class="ion-ios7-reload"></i>');
  }
};
