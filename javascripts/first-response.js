gh.authenticate(function(){

  $(function(){

    var issNum = window.queryVars.issue;
    var repo = decodeURIComponent(window.queryVars.repo);
    var issue;
    var config;
    var selectedCategory;
    var categoryQuestions;
    var categoryNextSteps;
    var responseBody;

    if (!issNum || !repo) {
      return alert('ERROR: NO ISSUE OR REPO');
    }

    // get the issue
    gh.get('/repos/'+repo+'/issues/'+issNum, {}, function(data, status, jqXHR){
      console.log(status, 'got issue');
      issue = data;
      update();
    });

    // get contrib.json for the project
    $.getJSON('https://rawgit.com/'+repo+'/master/contrib.json', {}, function(data, status, jqXHR){
      console.log(status, 'config', data);
      config = data;
      buildQuestions(config);
      update();
    });

    // update the content on the page when we have the issue and config
    function update(){
      if (issue && config) {
        $('#form-state').hide();
        $('#issue-form').show();
        
        $('#issue-title').html(issue.title);
        $('#issue-body').html(issue.body);

        var onGithub = $('<p><a href="http://github.com/'+repo+'/issues/'+issNum+'">Answer on Github<a></p>');

        $('#issue-body').append(onGithub);

        $('#personal-note').val('@'+issue.user.login+' ');

        buildQuestions();
      }
    }

    $('#personal-note').keyup(buildResponse);

    $('#enhancement').click(function(){ selectCategory('enhancement'); });
    $('#bug').click(function(){ selectCategory('bug'); });
    $('#question').click(function(){ selectCategory('question'); });

    function selectCategory(category){
      selectedCategory = category;

      $('.issue-category').addClass('not-chosen');
      $('#'+category).removeClass('not-chosen');

      buildQuestions();
      buildResponse();
    }

    function buildQuestions(){
      var configKey = '';
      categoryQuestions = [];
      categoryNextSteps = '';

      if (selectedCategory == 'bug') {
        configKey = 'report'
      } else if (selectedCategory == 'enhancement') {
        configKey = 'request'
      } else {
        configKey = selectedCategory;
      }

      if (config[configKey] && config[configKey].steps) {
        config[configKey].steps.forEach(function(step){
          if (step.prompt) {
            categoryQuestions.push(step.desc);
          }
        });

        categoryNextSteps = config[configKey].finished || '';
      }
    }

    function buildResponse(){
      responseBody = $('#personal-note').val();

      if (categoryQuestions && categoryQuestions.length > 0) {
        responseBody += '\n\n';
        responseBody += '> ### Please make sure these questions are answered. \n\n';

        categoryQuestions.forEach(function(question){
          responseBody += '> - ' + question+'\n';
        });

        if (categoryNextSteps) {
          responseBody += '\n> ### '+categoryNextSteps;
        }
      }

      $('#review-response').html(marked(responseBody, { breaks:true }));

      return responseBody;
    }

    $('#respond').click(function(){
      if (!selectedCategory) {
        return alert('No category selected');
      }
      
      $('#issue-form').hide();
      $('#form-state').html('Processing...').show();

      gh.patch('/repos/'+repo+'/issues/'+issNum, {
        labels: [selectedCategory]
      }, function(data, status, jqXHR){
        console.log(data);
      });

      gh.post('/repos/'+repo+'/issues/'+issNum+'/comments', {
        body: buildResponse()
      }, function(data, status, jqXHR){
        $('#form-state').html('Issue submitted: '+status);
      });

    });

  });
});