gh.authenticate(function(){
  gh.getUser({}, function(user){
    currentUser = user;

    gh.getAllIssues({}, function(allIssues){
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
  });
});


function updateIssueColumn(columnName, issues){
  if (issues.length === 0) {
    $('.'+columnName+'-issues .content').html('No issues');
    return;
  }

  _.each(issues, function(issue){
    var issueDiv = $('<div class="issue '+ issue.number +'"></div>');

    if (issue.needsResponse()) {
      issueDiv.addClass('needs-response');
    }

    issueDiv.append('<a href="issue.html_url" targt="_blank">'+
                    '  <span class="issue-number">'+ issue.number +'</span>'+
                       issue.title +
                    '</a>');

    $('.'+columnName+'-issues .content').append(issueDiv);
  });
};

