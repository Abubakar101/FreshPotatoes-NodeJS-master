const sqlite3 = require("sqlite3"),
  Sequelize = require("sequelize"),
  request = require("request"),
  express = require("express"),
  app = express();

const {
  PORT = 3000,
  NODE_ENV = "development",
  DB_PATH = "./db/database.db"
} = process.env;

// START SERVER
Promise.resolve()
  .then(() =>
    app.listen(PORT, () => console.log(`App listening on port ${PORT}`))
  )
  .catch(err => {
    if (NODE_ENV === "development") console.error(err.stack);
  });

// CONNECT TO DATABASE
let db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, err => {
  if (err) {
    console.error(err.message);
  }
  console.log("Connected to the SQL database.");
});

// ROUTES
app.use("/films/:id/recommendations", getFilmRecommendations);
// ROUTE HANDLER
function getFilmRecommendations(req, res, next) {
  // res.status(500).send('Not Implemented');

  let limit = 10,
    offset = 0;

  let recommendations = [];
  let id = req.params.id;
  let DBFetchData = [];

  // INVALID OR UNDEFINED IDS
  if (isNaN(id) || id === undefined) {
    return res.status(422).json({ message: "key missing" });
  }
  // INVALID QUERY PARMS
  if (isNaN(parseInt(req.query.offset)) && isNaN(parseInt(req.query.limit))) {
    if (
      !req.originalUrl.endsWith("recommendations") &&
      !req.originalUrl.endsWith("recommendations/")
    ) {
      return res.status(422).json({ message: "key missing" });
    }
  }

  // QUERY TO DB
  db.serialize(() => {
    db.all(
      `SELECT films.id, films.title, films.release_date AS releaseDate,  genres.name AS genre FROM films 
      INNER JOIN genres ON films.genre_id=genres.id 
      WHERE 
      genre_id = (SELECT genre_id FROM films WHERE id = ${id}) AND 
      release_date >= date((SELECT release_date FROM films WHERE id = ${id}), '-15 years') AND
      release_date <= date((SELECT release_date FROM films WHERE id = ${id}), '+15 years') `,
      (err, row) => {
        if (err) {
          console.error(err.message);
        }
        DBFetchData = row;

        // No DB Response
        if (!DBFetchData.length > 0) {
          return res.json({ message: `No Films with '${id}' ID` });
        }

        filmAPI(DBFetchData);
      }
    );
  });

  // FETCHING RATING & REVIEWS API
  function filmAPI(DBData) {
    let requestedAPI = 0;
    DBData.map(film => {
      let reviewAPI = {
        url: `http://credentials-api.generalassemb.ly/4576f55f-c427-4cfc-a11c-5bfe914ca6c1?films=${
          film.id
        }`,
        json: true
      };

      let revLength;
      let avgRating = 0;

      // return new Promise(function(resolve, reject) {
      request(reviewAPI, function(err, res, body) {
        requestedAPI++;

        // A minimum of 5 reviews
        revLength = body[0].reviews.length;
        if (revLength >= 5) {
          // An average rating greater than 4.0
          body[0].reviews.forEach(rate => {
            avgRating += rate.rating;
          });
          avgRating = (avgRating / revLength).toFixed(2);
          if (avgRating >= 4) {
            // Search min 5 reviews & >= 4.0 rating films in recommendations array
            if (body[0].film_id === film.id) {
              film = {
                id: film.id,
                title: film.title,
                releaseDate: film.releaseDate,
                genre: film.genre,
                averageRating: avgRating,
                reviews: revLength
              };
              recommendations.push(film);
            }
          }
        }
        // At the end of loop, render the films in JSON format
        if (DBData.length === requestedAPI) {
          JSONformat(recommendations);
        }
      });
    });
  }

  // RENDER AS JSON FORMAT
  function JSONformat(APIData) {
    let obj = {
      recommendations: APIData.splice(offset, limit),
      meta: { limit, offset }
    };
    res.json(obj);
  }
}

app.use(function(req, res, next) {
  res.status(404).json({ message: "key missing" });
  console.log(res.statusCode);
});

module.exports = app;
