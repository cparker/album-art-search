const express = require("express");
const app = express();
const cors = require("cors");
const PORT = process.env.PORT || 5000;
const axios = require("axios");
const bodyParser = require("body-parser");
const _ = require('lodash')
const morgan = require('morgan')

const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
const lastfmAlbumSearchAPI = `http://ws.audioscrobbler.com/2.0/?method=album.search&album=SEARCH_TERM&api_key=${LASTFM_API_KEY}&format=json`;

app.use(morgan('combined'))
app.use(cors());
app.use(bodyParser());
app.use(express.static("public/"));

function handleAlbumArtByName(req, res, next) {
  const missingImageURL = 'https://lastfm.freetls.fastly.net/i/u/300x300/0a3aac82f9fd440a99af1dbfac6ab96e.png'
  console.log("will search for", req.params.name);
  axios
    .get(lastfmAlbumSearchAPI.replace("SEARCH_TERM", req.params.name))
    .then((response) => {
      const images = _.get(response.data, 'results.albummatches.album[0].image')
      console.log('images is', images)
      const largestImageURL = images && images.length ? images[images.length - 1]['#text'] : missingImageURL
      const finalResult = largestImageURL && largestImageURL.length > 0 ? largestImageURL : missingImageURL
      res.status(200).send(finalResult);
    })
    .catch((err) => {
      console.log("error searching for album", err);
      res.status(500).send(err);
    });
}

function handleComposeQuery(req, res, next) {
  console.log('handling compose query, body is', req.body)
  res.status(200).send('OK')
}

function setupRoutes() {
  app.get("/albumArtByName/:name", handleAlbumArtByName);
  app.post("/composeExtension/query", handleComposeQuery)
}

function startServer() {
  app.listen(PORT, () => {
    console.log(`listening on ${PORT}`);
  });
}

setupRoutes();
startServer();
