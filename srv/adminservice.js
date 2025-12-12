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

  // Before handler to enforce unique attribute name
  this.before(['CREATE', 'UPDATE'], 'Attributes', async (req) => {
    const { name, ID } = req.data;
    if (!name) return;

    // Exclude current record on update
    const where = ID ? { name, ID: { '!=': ID } } : { name };

    const existing = await SELECT.one.from('com.dhi.cms.Attributes').where(where);
    if (existing) return req.reject(400, 'Unique constraint violated: Attribute name must be unique.');
  });

    this.before(['CREATE', 'UPDATE'], 'Attribute_Groups', async (req) => {
    const { name, ID } = req.data;
    if (!name) return;
    const where = ID ? { name, ID: { '!=': ID } } : { name };
    const existing = await SELECT.one.from('com.dhi.cms.Attribute_Groups').where(where);
    if (existing) return req.reject(400, 'Unique constraint violated: Attribute group name must be unique.');
  });

  // Before handler to enforce unique template name
  this.before(['CREATE', 'UPDATE'], 'Templates', async (req) => {
    const { name, ID } = req.data;
    if (!name) return;
    const where = ID ? { name, ID: { '!=': ID } } : { name };
    const existing = await SELECT.one.from('com.dhi.cms.Templates').where(where);
    if (existing) return req.reject(400, 'Unique constraint violated: Template name must be unique.');
  });

}