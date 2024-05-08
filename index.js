const ytcm = require("@freetube/yt-comment-scraper");
const ytch = require("yt-channel-info");
const https = require("https");
var getSubtitles = require("youtube-captions-scraper").getSubtitles;
let fetch = require("node-fetch");

const options = {
  hostname: "secure.google.com",
  port: 443,
  path: "/",
  method: "GET",
};
const agent = new https.Agent(options);
const fs = require("fs");
var path = require("path");
let lastContinuationId = true;
let count = 0;

(async function () {
  const channelId = "UCTVO-4rIuzg_rCQP37jjSTA";
  const payload = {
    channelId: channelId, // Required
    sortBy: "oldest",
    channelIdType: 0,
    httpsAgent: agent,
  };
  createScrappedDataForChannel(payload);
})();

async function createScrappedDataForChannel(payload) {
  let response = await ytch.getChannelVideos(payload);
  const arr = [];

  for (const item of response?.items) {
    console.log(item);

    let transcript = {};

    try {
      transcript = await getSubtitles({
        videoID: item.videoId,
      });
    } catch (error) {
      transcript = await getSubtitles({
        videoID: item.videoId,
        lang: "hi",
      });
    }

    let combinedTranscript = "";
    transcript?.forEach((obj) => {
      combinedTranscript += obj.text;
    });

    let paidPromotionResp = {};
    let isPaidPromotion = false;

    try {
      paidPromotionResp = await fetch(
        "https://yt.lemnoslife.com/videos?part=isPaidPromotion&id=" +
          item.videoId,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        }
      );
      isPaidPromotion = paidPromotionResp.items[0].isPaidPromotion
    } catch (error) {
      console.log(error);
    }

    let obj = {
      title: item.title,
      views: item.viewCount,
      length: item.lengthSeconds,
      duration: item.durationText,
      published: item.publishedText,
      transcript: combinedTranscript,
      isPaidPromotion: isPaidPromotion
    };

    //console.log(obj);

    arr.push(obj);
  }

  if (!response.continuation) {
    return;
  } else {
    await createDirAndStoreData(arr,count);
    payload["continuation"] = response.continuation;
  }
  count++;
  return createScrappedDataForChannel(payload);
}

async function createDirAndStoreData(video_data, count) {
  var dir = "videos";
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  fs.writeFileSync(
    path.join(dir, dir + "-" + count + ".json"),
    JSON.stringify(video_data),
    (err) => {
      if (err) console.log(err);
      else {
        console.log("File written successfully\n");
        console.log("The written has the following contents:");
      }
    }
  );
}

async function getComments(payload) {
  try {
    console.log("Retry :", retry);
    console.log("Payload :", payload.videoId + "/" + payload.continuation);
    if (retry > 2) return totalComments;
    let response = await ytcm.getComments(payload);
    let continuationId =
      response.continuation === null
        ? lastContinuationId
        : response.continuation;
    console.log("Response :", response?.comments?.length);
    if (totalComments.length > 0) {
      if (
        continuationId != totalComments[totalComments.length - 1].continuation
      ) {
        console.log(
          "Continuation : ",
          continuationId +
            "\n" +
            totalComments[totalComments.length - 1].continuation
        );
        totalComments.push(response);
        console.log("Total Comments :", totalComments.length);
      }
    } else if (totalComments.length === 0) {
      totalComments.push(response);
      console.log("Total Comments :", totalComments.length);
    }
    if (!continuationId) {
      console.log("....No More Comments Left....");
      return totalComments;
    } else {
      lastContinuationId = continuationId;
      payload["continuation"] = continuationId;
    }
    retry = 0;
  } catch (error) {
    if (payload.videoId === videoId) {
      retry++;
    }
    payload["continuation"] = lastContinuationId;
    console.log("Error : ", error);
  }
  return getComments(payload);
}
