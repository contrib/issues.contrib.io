gh.authenticate(function(){
  gh.getUser({}, function(user){
    currentUser = user;

    getAllIssues({}, function(allIssues){
      $(function(){
        getUncategorizedIssues(function(issues){
          updateIssueColumn('uncategorized', issues);
        });

        getUnconfirmedIssues(function(issues){
          updateIssueColumn('unconfirmed', issues);
        });

        getUnclaimedIssues(function(issues){
          updateIssueColumn('unclaimed', issues);
        });

        getIncompleteIssues(function(issues){
          updateIssueColumn('incomplete', issues);
        });
      });

    });
  });
});

function updateIssueColumn(columnName, issues){
  var html = '';

  _.each(issues, function(issue){
    html += '<div>';

    if (issue.needsResponse()) {
      html += '* ';
    }

    html += '<a href="'+issue.html_url+'" target="_blank">'+issue.number+'</a> '+issue.title+'</div>';
  });

  if (!html) {
    html = 'No issues';
  }

  $('#'+columnName+'-issues').html(html);
};