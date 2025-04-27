const axios = require("axios");
const cheerio = require("cheerio");
const qs = require("qs");

const cache = new Map();
const CACHE_TTL = 300000; 

const HEADERS = {
  "Accept": "*/*",
  "Accept-Language": "en-US,en;q=0.5",
  "Content-Type": "application/x-www-form-urlencoded",
  "X-FB-Friendly-Name": "PolarisPostActionLoadPostQueryQuery",
  "X-CSRFToken": "RVDUooU5MYsBbS1CNN3CzVAuEP8oHB52",
  "X-IG-App-ID": "1217981644879628",
  "X-FB-LSD": "AVqbxe3J_YA",
  "X-ASBD-ID": "129477",
  "User-Agent": "Mozilla/5.0 (Linux; Android 11; SAMSUNG SM-G973U) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/14.2 Chrome/87.0.4280.141 Mobile Safari/537.36"
};

const getInstagramPostId = (url) => {
  const match = url.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|tv|stories|reel)\/([^/?#&]+).*/);
  return match?.[1] || null;
};

const encodeGraphqlRequestData = (shortcode) => {
  const requestData = {
    av: "0",
    __d: "www",
    __user: "0",
    __a: "1",
    __req: "3",
    __hs: "19624.HYP:instagram_web_pkg.2.1..0.0",
    dpr: "3",
    __ccg: "UNKNOWN",
    __rev: "1008824440",
    __s: "xf44ne:zhh75g:xr51e7",
    __hsi: "7282217488877343271",
    __dyn: "7xeUmwlEnwn8K2WnFw9-2i5U4e0yoW3q32360CEbo1nEhw2nVE4W0om78b87C0yE5ufz81s8hwGwQwoEcE7O2l0Fwqo31w9a9x-0z8-U2zxe2GewGwso88cobEaU2eUlwhEe87q7-0iK2S3qazo7u1xwIw8O321LwTwKG1pg661pwr86C1mwraCg",
    __csr: "gZ3yFmJkillQvV6ybimnG8AmhqujGbLADgjyEOWz49z9XDlAXBJpC7Wy-vQTSvUGWGh5u8KibG44dBiigrgjDxGjU0150Q0848azk48N09C02IR0go4SaR70r8owyg9pU0V23hwiA0LQczA48S0f-x-27o05NG0fkw",
    __comet_req: "7",
    lsd: "AVqbxe3J_YA",
    jazoest: "2957",
    __spin_r: "1008824440",
    __spin_b: "trunk",
    __spin_t: "1695523385",
    fb_api_caller_class: "RelayModern",
    fb_api_req_friendly_name: "PolarisPostActionLoadPostQueryQuery",
    variables: JSON.stringify({
      shortcode,
      fetch_comment_count: null,
      fetch_related_profile_media_count: null,
      parent_comment_count: null,
      child_comment_count: null,
      fetch_like_count: null,
      fetch_tagged_user_count: null,
      fetch_preview_comment_count: null,
      has_threaded_comments: false,
      hoisted_comment_id: null,
      hoisted_reply_id: null,
    }),
    server_timestamps: "true",
    doc_id: "10015901848480474",
  };

  return qs.stringify(requestData);
};

const extractPostInfo = (mediaData) => {
  const getUrlFromData = (data) => {
    if (data.edge_sidecar_to_children) {
      return data.edge_sidecar_to_children.edges.map(
        edge => edge.node.video_url || edge.node.display_url
      );
    }
    return data.video_url ? [data.video_url] : [data.display_url];
  };
const filess = getUrlFromData(mediaData)
  return {
      caption: mediaData.edge_media_to_caption.edges[0]?.node.text || null,
      username: mediaData.owner.username,
      like: mediaData.edge_media_preview_like.count,
      comment: mediaData.edge_media_to_comment.count,
      isVideo: mediaData.is_video,
      dl: filess[0]
  };
};

const getPostGraphqlData = async (postId, proxy = null) => {
  const cacheKey = `graphql_${postId}`;
  const cached = cache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }

  const encodedData = encodeGraphqlRequestData(postId);
  const config = {
    headers: HEADERS,
    timeout: 10000 
  };
  
  if (proxy) config.httpsAgent = proxy;

  try {
    const response = await axios.post(
      "https://www.instagram.com/api/graphql",
      encodedData,
      config
    );
    
    const result = response.data;
    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    throw new Error(`GraphQL request failed: ${error.message}`);
  }
};

const getDownloadLinks = async (url) => {
  const cacheKey = `snapsave_${url}`;
  const cached = cache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }

  if (!url.match(/(?:https?:\/\/(web\.|www\.|m\.)?(facebook|fb)\.(com|watch)\S+)?$/) && 
      !url.match(/(https|http):\/\/www\.instagram\.com\/(p|reel|tv|stories)/gi)) {
    throw new Error("Invalid URL");
  }

  try {
    const response = await axios.post(
      "https://snapsave.app/action.php?lang=id",
      "url=" + url,
      {
        headers: {
          "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
          "content-type": "application/x-www-form-urlencoded",
          "origin": "https://snapsave.app",
          "referer": "https://snapsave.app/id",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36"
        },
        timeout: 10000
      }
    );

    const decodeData = (data) => {
      const [part1, , part3, part4, part5] = data;
      let part6 = "";
      
      for (let i = 0, len = part1.length; i < len; i++) {
        let segment = "";
        while (part1[i] !== part3[part5]) {
          segment += part1[i];
          i++;
        }

        for (let j = 0; j < part3.length; j++) {
          segment = segment.replace(new RegExp(part3[j], "g"), j.toString());
        }
        
        const charSet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/".split("");
        const baseSet = charSet.slice(0, part5);
        const decodeSet = charSet.slice(0, 10);

        let decodedValue = segment.split("").reverse().reduce((accum, char, index) => {
          if (baseSet.includes(char)) {
            return accum + baseSet.indexOf(char) * Math.pow(part5, index);
          }
          return accum;
        }, 0);

        let result = "";
        while (decodedValue > 0) {
          result = decodeSet[decodedValue % 10] + result;
          decodedValue = Math.floor(decodedValue / 10);
        }

        part6 += String.fromCharCode((result || "0") - part4);
      }
      
      return decodeURIComponent(escape(part6));
    };

    const extractParams = (data) => {
      return data.split("decodeURIComponent(escape(r))}(")[1]
                .split("))")[0]
                .split(",")
                .map(item => item.replace(/"/g, "").trim());
    };

    const extractDownloadUrl = (data) => {
      return data.split("getElementById(\"download-section\").innerHTML = \"")[1]
                .split("\"; document.getElementById(\"inputData\").remove(); ")[0]
                .replace(/\\?/g, "");
    };

    const getVideoUrl = (data) => {
      return extractDownloadUrl(decodeData(extractParams(data)));
    };

    const videoPageContent = getVideoUrl(response.data);
    const $ = cheerio.load(videoPageContent);
    const downloadLinks = [];
    
    $("div.download-items__btn a").each((index, element) => {
      let href = $(element).attr("href");
      if (href && !/https?:\/\//.test(href)) {
        href = "https://snapsave.app" + href;
      }
      if (href) downloadLinks.push(href);
    });

    if (!downloadLinks.length) {
      throw new Error("No download links found");
    }

    const result = {
      dl: downloadLinks[0],
      info: { url }
    };
    
    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    throw new Error(`Snapsave download failed: ${error.message}`);
  }
};


const Instagram = async (url, options = {}) => {
  const { proxy = null, useCache = true } = options;
  
  if (!useCache) {
    cache.clear(); 
  }

  const postId = getInstagramPostId(url);
  if (!postId) {
    throw new Error("Invalid Instagram URL");
  }

  try {
    const data = await getPostGraphqlData(postId, proxy);
    const mediaData = data.data?.xdt_shortcode_media;
    
    if (!mediaData) {
      throw new Error("No media data found in GraphQL response");
    }
    
    return extractPostInfo(mediaData);
  } catch (apiError) {
    console.log(`API method failed, falling back to snapsave: ${apiError.message}`);
    try {
      const result = await getDownloadLinks(url);
      return {
        url: [result.dl],
        metadata: {
          caption: null,
          username: null,
          like: null,
          comment: null,
          isVideo: result.dl.includes('.mp4')
        }
      };
    } catch (downloadError) {
      throw new Error(`Both methods failed: ${apiError.message}, ${downloadError.message}`);
    }
  }
};
module.exports = { Instagram }