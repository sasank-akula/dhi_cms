const cds = require('@sap/cds')
module.exports = async function () {
  this.on('getGroupAssociatedTemplates', async (req) => {

    const prQuery = `SELECT 
        "ID",
        "ATTRIBUTE_GROUP_ID",
        "NAME",
        "DESC",
        "ALIAS",
        STRING_AGG("TEMPLATE_NAME", ', ') AS "TEMPLATE_NAME"
      FROM "COM_DHI_CMS_ATTRIBUTEGROUPCATALOGUE"
      GROUP BY 
        "ID",
        "ATTRIBUTE_GROUP_ID",
        "NAME",
        "DESC",
        "ALIAS"
      ORDER BY "ATTRIBUTE_GROUP_ID" DESC`;

    const grpTemplates = await cds.run(prQuery);
    return grpTemplates;
  });

}