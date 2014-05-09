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
    $('.loading').html('<i class="ion-looping"></i> '+ text)
  },
  hide: function() {
    $('.loading').html('');
  }
}
