// http://fajitanachos.com/Authenticating-with-the-GitHub-API/
// Use gatekeeper to log people in
// https://github.com/prose/gatekeeper
// 
// Use github.js for other tasks
// https://github.com/michael/github
// other
// http://blog.vjeux.com/2012/javascript/github-oauth-login-browser-side.html

(function(){

var code;
var codeMatch = window.location.href.match(/\?code=(.*)/);
var repoURL = 'https://api.github.com/repos/videojs/video.js';
var categoryLabels = ['enhancement', 'bug', 'question', 'feature'];
var maintainers = ['heff', 'mmcc'];
var token;
var allIssues = [];
var allIssuesByNum = {};
var allComments = [];
var currentUser;
var client;
var gk;

if (window.location.href.indexOf('//localhost') !== -1) {
  client = '53fa7472045a17012bf4';
  gk = 'lhgk';
} else {
  client = '17d41b715e1dd3d5aa04';
  gk = 'cgk';
}

if (codeMatch) {
  code = codeMatch[1];
} else {
  getAuthCode();
  return;
}

$(function(){
  $.getJSON('http://'+gk+'.herokuapp.com/authenticate/'+code, function(data) {

    if (data && data.error == 'bad_code') {
      getAuthCode();
      return;
    }

    token = data.token;
    console.log('Successfully logged in');

    getUser({}, function(user){
      currentUser = user;

      getAllIssues({}, function(allIssues){

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

function getAuthCode(){
  location.href = 'https://github.com/login/oauth/authorize?client_id='+client+'&redirect_uri='+encodeURIComponent(window.location.href);
};

function getRepo(options, callback){
  options = _.merge({
    access_token: token
  }, options);

  $.getJSON(repoURL, options, callback);
}

function getRecords(urlPart, options, callback){
  options = _.merge({
    access_token: token,
    sort: 'created',
    direction: 'asc',
    per_page: 100
  }, options);

  console.log('get records', urlPart, options.page);

  $.getJSON(repoURL+urlPart, options, callback);
}

function getAllRecords(urlPart, options, callback){
  var allRecords = [];
  options = options || {};

  getPage(1);
  function getPage(pageNum){
    options.page = pageNum;

    getRecords(urlPart, options, function(records){
      allRecords = allRecords.concat(records);

      if (records.length == 100) {
        getPage(pageNum+1);
      } else {
        callback(allRecords);
      }
    });
  }
}

function getAllIssues(options, callback){
  allIssues = []; // store.get('allIssues')
  allIssuesByNum = {};

  options = _.merge({
    state: 'open'
  }, options);

  // only grab issues after the ones we have
  if (allIssues.length > 0) {
    options.since = allIssues[allIssues.length -1].created_at;
  }

  getAllRecords('/issues', options, function(issues){
    _.each(issues, function(issueData){
      var issue = new Issue(issueData);
      allIssues.push(issue);
    });

    // store.set('allIssues', allIssues);

    // build allIssuesByNum from scratch
    _.each(allIssues, function(issue){
      allIssuesByNum[issue.number] = issue;
    });

    // update all comments and associate them with issues
    getAllComments({}, function(comments){
      _.each(comments, function(comment, i){
        comment.issue_number = parseInt(comment.issue_url.replace(/^\D+/, ''), 10);

        var issue = allIssuesByNum[comment.issue_number];

        // issue may be closed and not exist here
        if (issue) {
          issue.comments.push(comment);
          if (issue.commenters.indexOf(comment.user.login) <= 0) {
            issue.commenters.push(comment.user.login);
          }

          
        }
      });

      // finish getAllIssues
      callback(allIssues);
    });
  });
}

function getIssuesComments(options, callback){
  options = _.merge({
    per_page: 100,
    sort: 'created',
    direction: 'asc'
    // since: 'YYYY-MM-DDTHH:MM:SSZ'
  }, options);

  $.getJSON(repoURL+'/issues/comments', options, function(comments){
    callback(comments);
  });
}

function getAllComments(options, callback) {
  allComments = [];

  options = _.merge({}, options);
  // only get comments the come after the first open issue
  if (allIssues.length > 0) {
    options.since = allIssues[0].created_at;
  }

  getAllRecords('/issues/comments', options, function(comments){
    allComments = allComments.concat(comments);
    callback(allComments);
  });
}

function getUser(options, callback){
  options = _.merge({
    access_token: token
  }, options);

  $.getJSON('https://api.github.com/user', options, function(user){
    callback(user);
  });
}

function sortByNeedsResponse(issues){
  var needs = [];
  var noNeeds = [];
  issues = issues || allIssues;

  _.each(issues, function(issue){
    if (issue.needsResponse()) {
      needs.push(issue);
    } else {
      noNeeds.push(issue);
    }
  });

  return needs.concat(noNeeds);
}

function sortByCommentersCount(issues){
  issues = issues || allIssues;

  // lodash-fu to sort by commenter number decsending
  return _(issues).sortBy(function(issue){ return issue.commenters.length }).reverse().value();
}

function getUncategorizedIssues(callback){
  var uncategorized = [];

  _.each(allIssues, function(issue){
    if (issue.state == 'created') {
      uncategorized.push(issue);
    }
  });

  callback(sortByNeedsResponse(uncategorized));
}

function getUnconfirmedIssues(callback){
  var unconfirmed = [];

  // check for issues that have nobody assigned to them
  _.each(allIssues, function(issue, i){
    if (issue.state == 'categorized') {
      unconfirmed.push(issue);
    }
  });

  callback(sortByNeedsResponse(unconfirmed));
}

function getUnclaimedIssues(callback){
  var unclaimed = [];

  // check for issues that have nobody assigned to them
  _.each(allIssues, function(issue, i){
    if (issue.state == 'confirmed') {
      unclaimed.push(issue);
    }
  });

  callback(sortByCommentersCount(unclaimed));
}

function getIncompleteIssues(callback){
  var incomplete = [];

  _.each(allIssues, function(issue){
    if (issue.state == 'claimed') {
      incomplete.push(issue); 
    }
  });

  callback(sortByNeedsResponse(incomplete));
}

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


/**
 * Issue Class
 * @param {Object} data Raw issue data
 */
function Issue(data){
  _.merge(this, data);

  // i want to use 'state'
  this.origState = this.state;
  this.state = this.getState();

  // comments should really be comments_count
  this.comments_count = this.comments;
  this.comments = [];
  this.commenters = [];
}

Issue.prototype.getState = function(){
  if (!this.isCategorized()) {
    return this.state = 'created';
  } else if (!this.isConfirmed()) {
    return this.state = 'categorized';
  } else if (!this.isClaimed()) {
    return this.state = 'confirmed';
  } else {
    return this.state = 'claimed';
  }
};

Issue.prototype.isCategorized = function(){
  return !!this.getCategory();
};

Issue.prototype.getCategory = function(){
  if (this.category_ !== undefined) {
    return this.category_;
  }

  this.category_ = false;
  if (this.labels.length > 0) {
    this.category_ = _.find(this.labels, function(label){
      return categoryLabels.indexOf(label.name) >= 0;
    });
  }

  return this.category_;
};

Issue.prototype.isConfirmed = function(){
  if (this.confirmed_ !== undefined) {
    return this.confirmed_;
  }

  this.confirmed_ = this.isCategorized() && _.some(this.labels, function(label){
    return label.name === 'confirmed';
  });

  return this.confirmed_;
};

Issue.prototype.isClaimed = function(){
  if (this.claimed_ !== undefined) {
    return this.claimed_;
  }

  this.claimed_ = this.isConfirmed() && !!(this.assignee || this.pull_request);

  return this.claimed_;
};

Issue.prototype.lastCommentByMaintainer = function(callback){
  var lastCommenter = this.comments[this.comments.length - 1].user.login;

  if (maintainers.indexOf(lastCommenter) >= 0) {
    return true;
  } else {
    return false;
  }
};

Issue.prototype.isMine = function(callback){
  var lastCommenter = this.comments[this.comments.length - 1].user.login;

  if (maintainers.indexOf(lastCommenter) >= 0) {
    return true;
  } else {
    return false;
  }
};

Issue.prototype.isMine = function(){
  return this.user.login === currentUser.login;
};

Issue.prototype.lastComment = function(){
  return this.comments[this.comments.length - 1];
};

/**
 * Situations where an issue needs your response
 * - you submitted it and you are not the last commenter
 * - you are a maintainer and a maintainer is not the last commenter
 */
Issue.prototype.needsResponse = function(callback){
  if (this.isMine()) {
    if (this.lastComment() && this.lastComment().user.login !== currentUser.login) {
      return true;
    } else {
      return false;
    }
  }

  if (maintainers.indexOf(currentUser.login) >= 0) {
    if (this.comments_count == 0) {
      if (!this.confirmed_) {
        // if there's no comments on an unconfirmed issue, it needs a response
        return true;
      } else {
        // it could be a confirmed issue from a maintainer, no comments
        return !(maintainers.indexOf(this.user.login) >= 0);
      }
    }

    // if (!this.getNeeds() || this.getNeeds().length == 0) {
    //   return false;
    // }

    // if the last commenter was 'us', it hasn't been updated yet
    if (maintainers.indexOf(this.lastComment().user.login) >= 0) {
      return false;
    } else {
      return true;
    }
  }
};

Issue.prototype.getNeeds = function(){
  if (this.needs_) {
    return this.needs_;
  }

  this.needs_ = [];

  var issue = this;
  _.each(this.labels, function(label){
    if (label.name.indexOf('needs:') >= 0) {
      issue.needs_.push(label.name.replace(/needs:\s?/, ''));
    }
  });

  return this.needs_;
};

Issue.prototype.getComments = function(callback){
  if (this.commentList_) {
    return callback(issue.commentList_);
  }

  if (this.comments_count == 0) {
    this.commentList_ = [];
    return callback(this.commentList_);
  }

  // options = _.merge({
  //   // sort: 'created',
  //   // direction: 'desc',
  //   // since: 'YYYY-MM-DDTHH:MM:SSZ'
  // }, options);

  $.getJSON(repoURL+'/issues/'+this.number+'/comments', {}, function(comments){
    this.commentList_ = comments;
    callback(this.commentList_);
  });
};

})();