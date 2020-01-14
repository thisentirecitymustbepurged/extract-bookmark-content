const reqp = require('request-promise')
const req = require('request')
// const cheerio = require('cheerio')
const fs = require('fs')
let links = require('./9gag-links.json')
links = links.filter(s => s.includes('9cache')).map(uri => ({ uri }))

const ROOT_PATH = fs.realpathSync('.');

const sleep = async ms => new Promise(resolve => setTimeout(resolve, ms))

const getConfig = res => {
  const regexp = /<script type=\"text\/javascript\">window._config = JSON.parse\((.*)\);<\/script>/
  const match = regexp.exec(res.body);
  const config = JSON.parse(JSON.parse(match[1]))

  return config;
}

const getMediaURI = config => {
  const images = config.data.post.images
  const imageKeys = Object.keys(images);
  const videoKey = imageKeys.find(key => key.includes('sv'));
  let uri;

  if (videoKey) {
    uri = uri = images.image700sv ? images.image700sv.url : images.image460sv.url
  } else {
    uri = images.image700 ? images.image700.url : images.image460.url
  }

  return uri
}

const request = async (options, callback) => {
  options = {
    resolveWithFullResponse: true,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.117 Safari/537.36'
    },
    ...options,
  }
  let res;

  try {
    res = await reqp(options, callback)
  } catch (err) {
    res = err;
  }

  return res;
}

const download9GAGPostMedia = async options => {
  try {
    const res = await request(options);
    const config = getConfig(res);
    const mediaURI = getMediaURI(config);
    const name = config.data.post.title.replace(/[^\w\s]/gi, '').slice(0, 250)
    const extension = mediaURI.split('.').pop();

    req(mediaURI).pipe(fs.createWriteStream(`${ROOT_PATH}/media/${name}.${extension}`))

    return { success: true };
  } catch (error) {
    return { error }
  }
}

const download9GAGMedia = async options => {
  try {
    const mediaURI = options.uri.includes('comment-cdn') ? options.uri.split('#')[1] : options.uri;
    const name = mediaURI.split('/').pop()
    const extension = mediaURI.split('.').pop();

    req(mediaURI).pipe(fs.createWriteStream(`${ROOT_PATH}/media/${name}.${extension}`))

    return { success: true };
  } catch (error) {
    return { error }
  }
}


const downloadAll = async downloader => {
  const linksClone = [...links];

  for (let i = 0; i < linksClone.length - 1; i += 1) {
    const link = linksClone[i];
    const { success } = await downloader(link);

    if (success) {
      links = links.filter((e, j) => j !== i)
    }

    await sleep(500)
  }

  if (links.length) {
    downloadAll(downloader);
  }
}

// downloadAll(download9GAGPostMedia);
// downloadAll(download9GAGMedia);

console.log(links.length)

