/**
 * @file migrate-mongo-config.js
 * @layer Database
 * @responsibility Configuration for migrate-mongo CLI
 */

const config = {
  mongodb: {
    url: process.env.MONGODB_URI || 'mongodb://localhost:27017/makon',
    databaseName: '',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
  migrationsDir: 'src/database/migrations',
  changelogCollectionName: 'changelog',
  migrationFileExtension: '.ts',
  useFileHash: false,
  moduleSystem: 'esm',
}

module.exports = config
