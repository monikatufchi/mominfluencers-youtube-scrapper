var getSubtitles = require('youtube-captions-scraper').getSubtitles;

getSubtitles({
  videoID: 'k8tqCn6um-M', // youtube video id
  lang: 'hi' // default: `en`
}).then(function(captions) {
  console.log(captions);
});