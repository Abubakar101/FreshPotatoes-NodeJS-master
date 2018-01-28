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

// Connect to DB
let db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, err => {
  if (err) {
    console.error(err.message);
  }
  console.log("Connected to the SQL database.");
});

// ROUTES
app.get("/films/:id/recommendations", getFilmRecommendations);

// ROUTE HANDLER
function getFilmRecommendations(req, res) {
  // res.status(500).send('Not Implemented');

  let limit = 10,
    offset = 1;

  if (req.query.limit) {
    limit = parseInt(req.query.limit);
  } else if (req.query.offset) {
    offset = parseInt(req.query.offset);
  }

  // debugger;

  let recommendations = [];
  let id = req.params.id;

  // Invalid Or Undefined IDs
  if (isNaN(id) || id === undefined) {
    return res.status(422).json({ message: "key missing" });
  }

  // Query to DB
  db.serialize(() => {
    db.all(
      `Select * from films 
      WHERE 
      genre_id = (SELECT genre_id FROM films WHERE id = ${id}) AND 
      release_date >= date((SELECT release_date FROM films WHERE id = ${id}), '-15 years') AND
      release_date <= date((SELECT release_date FROM films WHERE id = ${id}), '+15 years') `,
      (err, row) => {
        if (err) {
          console.error(err.message);
        }
        recommendations = row;

        // No DB Response
        if (!recommendations.length > 0) {
          return res.json({
            message: `Couldn't find recommended films with => ${id} Id!`
          });
        }
        res.json({
          recommendations: recommendations.slice(offset, limit),
          meta: { limit, offset }
        });

        // console.log(recommendations);
      }
    );
  });
}

module.exports = app;
