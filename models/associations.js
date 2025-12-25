const sequelize = require('../config/database');
const { User, Movie, Genre, Person, Rating, Review, Watchlist } = require('./index');

// User associations
User.hasMany(Rating, { foreignKey: 'user_id' });
User.hasMany(Review, { foreignKey: 'user_id' });
User.hasMany(Watchlist, { foreignKey: 'user_id' });

// Movie associations
Movie.hasMany(Rating, { foreignKey: 'movie_id' });
Movie.hasMany(Review, { foreignKey: 'movie_id' });
Movie.hasMany(Watchlist, { foreignKey: 'movie_id' });

// Rating associations
Rating.belongsTo(User, { foreignKey: 'user_id' });
Rating.belongsTo(Movie, { foreignKey: 'movie_id' });

// Review associations
Review.belongsTo(User, { foreignKey: 'user_id' });
Review.belongsTo(Movie, { foreignKey: 'movie_id' });

// Watchlist associations
Watchlist.belongsTo(User, { foreignKey: 'user_id' });
Watchlist.belongsTo(Movie, { foreignKey: 'movie_id' });

// Many-to-many relationships
// Movie-Genre
const MovieGenre = sequelize.define('MovieGenre', {}, { tableName: 'movie_genres', timestamps: false });
Movie.belongsToMany(Genre, { through: MovieGenre, foreignKey: 'movie_id' });
Genre.belongsToMany(Movie, { through: MovieGenre, foreignKey: 'genre_id' });

// Movie-Person (Cast)
const Cast = sequelize.define('Cast', {
  character_name: { type: sequelize.DataTypes.STRING(100) },
  cast_order: { type: sequelize.DataTypes.INTEGER }
}, { tableName: 'cast', timestamps: false });
Movie.belongsToMany(Person, { through: Cast, foreignKey: 'movie_id', as: 'cast' });
Person.belongsToMany(Movie, { through: Cast, foreignKey: 'person_id', as: 'castMovies' });

// Movie-Person (Crew)
const Crew = sequelize.define('Crew', {
  department: { type: sequelize.DataTypes.STRING(50) },
  job: { type: sequelize.DataTypes.STRING(50) }
}, { tableName: 'crew', timestamps: false });
Movie.belongsToMany(Person, { through: Crew, foreignKey: 'movie_id', as: 'crew' });
Person.belongsToMany(Movie, { through: Crew, foreignKey: 'person_id', as: 'crewMovies' });

module.exports = {
  User,
  Movie,
  Genre,
  Person,
  Rating,
  Review,
  Watchlist,
  MovieGenre,
  Cast,
  Crew
};