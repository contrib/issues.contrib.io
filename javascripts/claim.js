gh.authenticate(function(){
  gh.getAllIssues({ labels: 'confirmed' }, function(allIssues){
    console.log(allIssues.length);

    $(function(){
      allIssues.forEach(function(issue){
        console.log('issue', issue.title);
        $('#issues').append('<div>'+issue.title+'</div>');        
      });
    });
  });
});