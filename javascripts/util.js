window.queryVars = {};

window.location.search.substring(1).split('&').forEach(function(str){
  if (!str) return;
  str = str.split('=');
  window.queryVars[str[0]] = str[1];
});