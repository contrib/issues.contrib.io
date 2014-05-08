// http://fajitanachos.com/Authenticating-with-the-GitHub-API/
// Use gatekeeper to log people in
// https://github.com/prose/gatekeeper
// 
// Use github.js for other tasks
// https://github.com/michael/github
// other
// http://blog.vjeux.com/2012/javascript/github-oauth-login-browser-side.html

(function(){

var gh = window.gh = {};

var _authCode = window.queryVars && window.queryVars.code;
var _authToken;
var _currentUser;

var categoryLabels = ['enhancement', 'bug', 'question', 'feature'];
var maintainers = ['heff', 'mmcc'];
var allIssues = [];
var allIssuesByNum = {};
var allComments = [];

var repoName;
if (window.queryVars.repo) {
  repoName = decodeURIComponent(window.queryVars.repo);
} else {
  repoName = 'videojs/video.js';
}

console.log(repoName, window.queryVars.repo);
var repoUrlPart = '/repos/'+repoName;
var repoURL = 'https://api.github.com/repos/'+repoName;

// Set up the correct client and gatekeeper depending on if this is localhost
var _client;
var _gk;

if (window.location.href.indexOf('//localhost') !== -1) {
  client = '53fa7472045a17012bf4';
  gk = 'lhgk';
} else {
  client = '17d41b715e1dd3d5aa04';
  gk = 'cgk';
}

gh.authenticate = function(callback){
  if (_authCode) {
    gh.getAuthToken(function(token){
      _authToken = token;

      // go ahead and grab user info since we use it all over
      gh.getUser({}, function(user){
        _currentUser = user;
        callback();
      });
    });
  } else {
    // redirect to the github login
    gh.getAuthCode();
  }
};

gh.getAuthToken = function(callback){
  $.getJSON('http://'+gk+'.herokuapp.com/authenticate/'+_authCode, function(data) {
    if (data && data.error == 'bad_code') {
      gh.getAuthCode();
      return;
    }
    callback(data.token);
  });
};

gh.getAuthCode = function(){
  // redirect to github login, which will redirect back to this page
  window.location.href = 'https://github.com/login/oauth/authorize?client_id='+client+'&redirect_uri='+encodeURIComponent(window.location.href);
};

gh.get = function(urlPart, options, callback){
  options = _.merge({
    access_token: _authToken
  }, options);

  $.getJSON('https://api.github.com'+urlPart, options, callback);
};

gh.getUser = function(options, callback){
  gh.get('/user', options, callback);
};

gh.getRepo = function(options, callback){
  gh.get(repoUrlPart, options, callback);
};

gh.getIndex = function(urlPart, options, callback){
  options = _.merge({
    sort: 'created',
    direction: 'asc',
    per_page: 100
  }, options);

  console.log('get index', urlPart, options.page);

  gh.get(urlPart, options, callback);
};

gh.getIndexAll = function(urlPart, options, callback){
  var allRecords = [];
  options = options || {};

  getPage(1);
  function getPage(pageNum){
    options.page = pageNum;

    gh.getIndex(urlPart, options, function(records){
      allRecords = allRecords.concat(records);

      if (records.length == 100) {
        getPage(pageNum+1);
      } else {
        callback(allRecords);
      }
    });
  }
};

gh.getAllIssues = function(options, callback){
  allIssues = []; // store.get('allIssues')
  allIssuesByNum = {};

  options = _.merge({
    state: 'open'
  }, options);

  // only grab issues after the ones we have
  if (allIssues.length > 0) {
    options.since = allIssues[allIssues.length -1].created_at;
  }

  gh.getIndexAll(repoUrlPart+'/issues', options, function(issues){
    _.each(issues, function(issueData){
      var issue = new gh.Issue(issueData);
      allIssues.push(issue);
    });

    // store.set('allIssues', allIssues);

    // build allIssuesByNum from scratch
    _.each(allIssues, function(issue){
      allIssuesByNum[issue.number] = issue;
    });

    // update all comments and associate them with issues
    gh.getAllComments({}, function(comments){
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

      sessionStorage.setItem('allIssues', allIssues);

      // finish getAllIssues
      callback(allIssues);
    });
  });
}

gh.getIssuesComments = function(options, callback){
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

gh.getAllComments = function(options, callback) {
  // reset all comments array
  allComments = [];

  options = _.merge({}, options);
  // only get comments the come after the first open issue
  if (allIssues.length > 0) {
    options.since = allIssues[0].created_at;
  }

  gh.getIndexAll(repoUrlPart+'/issues/comments', options, function(comments){
    allComments = allComments.concat(comments);
    callback(allComments);
  });
}

gh.sortByNeedsResponse = function(issues){
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

gh.sortByCommentersCount = function(issues){
  issues = issues || allIssues;

  // lodash-fu to sort by commenter number decsending
  return _(issues).sortBy(function(issue){ return issue.commenters.length }).reverse().value();
}

gh.getUncategorizedIssues = function(callback){
  var uncategorized = [];

  _.each(allIssues, function(issue){
    if (issue.state == 'created') {
      uncategorized.push(issue);
    }
  });

  callback(gh.sortByNeedsResponse(uncategorized));
};

gh.getUnconfirmedIssues = function(callback){
  var unconfirmed = [];

  // check for issues that have nobody assigned to them
  _.each(allIssues, function(issue, i){
    if (issue.state == 'categorized') {
      unconfirmed.push(issue);
    }
  });

  callback(gh.sortByNeedsResponse(unconfirmed));
}

gh.getUnclaimedIssues = function(callback){
  var unclaimed = [];

  // check for issues that have nobody assigned to them
  _.each(allIssues, function(issue, i){
    if (issue.state == 'confirmed') {
      unclaimed.push(issue);
    }
  });

  callback(gh.sortByCommentersCount(unclaimed));
}

gh.getIncompleteIssues = function(callback){
  var incomplete = [];

  _.each(allIssues, function(issue){
    if (issue.state == 'claimed') {
      incomplete.push(issue); 
    }
  });

  callback(gh.sortByNeedsResponse(incomplete));
}

/**
 * Issue Class
 * @param {Object} data Raw issue data
 */
gh.Issue = function(data){
  _.merge(this, data);

  // i want to use 'state'
  this.origState = this.state;
  this.state = this.getState();

  // comments should really be comments_count
  this.comments_count = this.comments;
  this.comments = [];
  this.commenters = [];
}

gh.Issue.prototype.getState = function(){
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

gh.Issue.prototype.isCategorized = function(){
  return !!this.getCategory();
};

gh.Issue.prototype.getCategory = function(){
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

gh.Issue.prototype.isConfirmed = function(){
  if (this.confirmed_ !== undefined) {
    return this.confirmed_;
  }

  this.confirmed_ = this.isCategorized() && _.some(this.labels, function(label){
    return label.name === 'confirmed';
  });

  return this.confirmed_;
};

gh.Issue.prototype.isClaimed = function(){
  if (this.claimed_ !== undefined) {
    return this.claimed_;
  }

  this.claimed_ = this.isConfirmed() && !!(this.assignee || this.pull_request);

  return this.claimed_;
};

gh.Issue.prototype.lastCommentByMaintainer = function(callback){
  var lastCommenter = this.comments[this.comments.length - 1].user.login;

  if (maintainers.indexOf(lastCommenter) >= 0) {
    return true;
  } else {
    return false;
  }
};

gh.Issue.prototype.isMine = function(callback){
  var lastCommenter = this.comments[this.comments.length - 1].user.login;

  if (maintainers.indexOf(lastCommenter) >= 0) {
    return true;
  } else {
    return false;
  }
};

gh.Issue.prototype.isMine = function(){
  return this.user.login === _currentUser.login;
};

gh.Issue.prototype.lastComment = function(){
  return this.comments[this.comments.length - 1];
};

/**
 * Situations where an issue needs your response
 * - you submitted it and you are not the last commenter
 * - you are a maintainer and a maintainer is not the last commenter
 */
gh.Issue.prototype.needsResponse = function(callback){
  if (this.isMine()) {
    if (this.lastComment() && this.lastComment().user.login !== _currentUser.login) {
      return true;
    } else {
      return false;
    }
  }

  if (maintainers.indexOf(_currentUser.login) >= 0) {
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

gh.Issue.prototype.getNeeds = function(){
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

gh.Issue.prototype.getComments = function(callback){
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

  gh.get(repoURLPart+'/issues/'+this.number+'/comments', {}, function(comments){
    this.commentList_ = comments;
    callback(this.commentList_);
  });
};

})();