var db = new PouchDB('issues');

$(function() {
  $('.reload').click(function(e) {
    loadIssues();
  });
});

gh.authenticate(function(){
  gh.getUser({}, function(user){
    currentUser = user;

    // Disabling this for now until we set up everything to load from
    // the DB first as discussed.

    // db.get('last-updated').then(function(lastUpdated) {
    //   loadIssues({ since: lastUpdated, _rev: lastUpdated._rev });
    // }).catch(function(e) {
    //   loadIssues();
    // });
    
    loadIssues();
  });
});

function loadIssues(options) {
  utils.loading.show();

  options = options || {};

  gh.getAllIssues(options, function(allIssues){
      utils.loading.hide();
      $(function(){
        gh.getUncategorizedIssues(function(issues){
          updateIssueColumn('uncategorized', issues);
        });

        gh.getUnconfirmedIssues(function(issues){
          updateIssueColumn('unconfirmed', issues);
        });

        gh.getUnclaimedIssues(function(issues){
          updateIssueColumn('unclaimed', issues);
        });

        gh.getIncompleteIssues(function(issues){
          updateIssueColumn('incomplete', issues);
        });
      });

      updateTimestamp(options._rev);
    });
}

function updateIssueColumn(columnName, issues){
  if (_.isEmpty(issues)) {
    $('.'+columnName+'-issues').addClass('finished');
    return;
  }

  var $columnEl = $('.'+columnName+'-issues .content');

  $columnEl.empty();

  _.each(issues, function(issue){
    var issueDiv = $('<div id="'+ issue.number +'" class="issue"></div>');

    if (issue.needsResponse()) {
      issueDiv.addClass('needs-response');
    }

    issueDiv.append('<span class="issue-number">'+ issue.number +'</span>');
    issueDiv.append('<a href="'+ issue.html_url +'" target="_blank">'+
                       issue.title +
                    '</a>');

    $columnEl.append(issueDiv);
  });
}

function updateTimestamp(_rev) {
  db.put({
    timestamp: Date.now()
  }, 'last-updated', _rev).then(function(newDoc) {
    console.log(newDoc);
  });
}
