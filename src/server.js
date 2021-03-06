const express = require("express");
const app = express();
const cors = require("cors");
const PORT = process.env.PORT || 5000;
const axios = require("axios");
const bodyParser = require("body-parser");
const _ = require("lodash");
const morgan = require("morgan");

const {
  BotFrameworkAdapter,
  ActivityTypes,
  TeamsActivityHandler,
  CardFactory,
} = require("botbuilder");

const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
const lastfmAlbumSearchAPI = `http://ws.audioscrobbler.com/2.0/?method=album.search&album=SEARCH_TERM&api_key=${LASTFM_API_KEY}&format=json`;

const missingImageURL =
  "https://lastfm.freetls.fastly.net/i/u/300x300/0a3aac82f9fd440a99af1dbfac6ab96e.png";

app.use(morgan("combined"));
app.use(cors());
app.use(bodyParser());
app.use(express.static("public/"));

const adapter = new BotFrameworkAdapter({
  appId: process.env.APP_ID,
  appPassword: process.env.APP_PW,
});

async function getAlbumArtUrlByName(name) {
  return new Promise((resolve, reject) => {
    axios
    .get(lastfmAlbumSearchAPI.replace("SEARCH_TERM", name))
    .then((response) => {
      const images = _.get(
        response.data,
        "results.albummatches.album[0].image"
      );
      const artist = _.get(response.data, 'results.albummatches.album[0].artist', '')
      const albumName = _.get(response.data, 'results.albummatches.album[0].name', '')
      console.log("images is", images);
      const largestImageURL =
        images && images.length
          ? images[images.length - 1]["#text"]
          : missingImageURL;
      const imageURL =
        largestImageURL && largestImageURL.length > 0
          ? largestImageURL
          : missingImageURL;

      resolve({
        imageURL, 
        artist,
        albumName
      })
    })
    .catch((err) => {
      console.log("error searching for album", err);
      reject(err)
    });
  })
}

async function handleAlbumArtByName(req, res, next) {
  console.log("will search for", req.params.name);
  try {
    const info = await getAlbumArtUrlByName(req.params.name)
    res.status(200).send(info)
  } catch (err) {
    res.status(500).send(err)
  }
}

class MessageExtension extends TeamsActivityHandler {
  async handleTeamsMessagingExtensionQuery(context, query) {
    console.log('query looks like', JSON.stringify(query))
    const {imageURL, artist, albumName} = await getAlbumArtUrlByName(query.parameters[0].value)
    const imageCard = CardFactory.heroCard(
      `${albumName} - ${artist}`,
      CardFactory.images([imageURL])
    );

    return {
      composeExtension: {
        type: "result",
        attachmentLayout: "list",
        attachments: [imageCard],
      },
    };
  }

  async handleTeamsMessagingExtensionSelectItem(context, obj) {}
}

const messageExtension = new MessageExtension();

function handleBotMessages(req, res, next) {
  console.log("handleBotMessages", JSON.stringify(req.body, null, 2));
  adapter.processActivity(req, res, async (context) => {
    if (context.activity.type === ActivityTypes.Invoke) {
      await messageExtension.run(context);
    } else {
      console.log("no handler for activity: ", context.activity);
    }
  });
}

function setupRoutes() {
  app.get("/albumArtByName/:name", handleAlbumArtByName);
  app.post("/api/messages", handleBotMessages);
}

function startServer() {
  app.listen(PORT, () => {
    console.log(`listening on ${PORT}`);
  });
}

setupRoutes();
startServer();
