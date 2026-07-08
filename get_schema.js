const { DataSource } = require('typeorm');
const { LicenseAssignment } = require('./dist/apps/backend/src/modules/admin/entities/license-assignment.entity.js');
const { UserInvitation } = require('./dist/apps/backend/src/modules/admin/entities/user-invitation.entity.js');
const { LicenseHistory } = require('./dist/apps/backend/src/modules/admin/entities/license-history.entity.js');

const ds = new DataSource({
  type: 'sqlite',
  database: ':memory:',
  entities: [LicenseAssignment, UserInvitation, LicenseHistory],
  synchronize: false
});

ds.initialize().then(async () => {
  const sqlInMemory = await ds.driver.createSchemaBuilder().log();
  console.log(sqlInMemory.upQueries.map(q => q.query).join(';\n'));
  process.exit(0);
}).catch(console.error);
