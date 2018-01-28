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

// Connected to DB
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

  // Query to DB
  let recommendations = [];
  let id = req.params.id;
  let add = 15;
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
        res.json({recommendations});

        // console.log(recommendations);
      }
    );


  });

}

module.exports = app;
