var db = new PouchDB('issues');

$(function() {
  $('.reload').click(loadIssues);
});

gh.authenticate(function(){
  gh.getUser({}, function(user){
    currentUser = user;

    loadIssues();
  });
});

function loadIssues() {
  utils.loading.show();
  gh.getAllIssues({}, function(allIssues){
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

    });
}

// TODO: Move this into the Github module
function addIssueToDb(columnName, issue) {
  var newIssue = {
    _id: new Date().toISOString(),
    group: columnName,
    issue: issue,
    completed: false
  };
  db.put(newIssue, function callback(err, result) {
    if (err) { console.log(err) }
  });
}

function updateIssueColumn(columnName, issues){
  if (_.isEmpty(issues)) {
    $('.'+columnName+'-issues').addClass('finished');
    return;
  }

  _.each(issues, function(issue){
    addIssueToDb(columnName, issue);

    var issueDiv = $('<div id="'+ issue.number +'" class="issue"></div>');

    if (issue.needsResponse()) {
      issueDiv.addClass('needs-response');
    }

    issueDiv.append('<span class="issue-number">'+ issue.number +'</span>');
    issueDiv.append('<a href="'+ issue.html_url +'" target="_blank">'+
                       issue.title +
                    '</a>');

    $('.'+columnName+'-issues .content').append(issueDiv);
  });
};

